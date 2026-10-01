import { useI18n } from "./i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Play,
  Square,
  Sparkles,
  Trash2,
  Plus,
  Copy,
  Shuffle,
  Upload,
  Library,
} from "lucide-react";
import { defaultSound, durationOf, playSound, renderSound } from "./audio";
import type { Sound, SoundDefinition, Waveform } from "./audio";
import { physicalLibrary, physicalOrder } from "./engine/index.ts";
import { ProgramPanel } from "./ProgramPanel";
import { fmtDb, fmtPct, inspectBuffer } from "./inspector";
import type { AudioMetrics } from "./inspector";
import { fixSound } from "./autofix";
import { downloadReport, iterationReport } from "./report";
import type { IterationReport } from "./report";
import { drawSpectrogram, spectrogram } from "./spectrogram";
import type { SpectralBurst } from "./spectrogram";
import { attributeLayers, surgicalFix } from "./attribution";
import type { LayerAttribution } from "./attribution";
import { downloadOptimization, optimizeSound } from "./optimizer";
import type { OptimizeResult } from "./optimizer";
import { parseSoundDsl } from "./schema";
import { compileSound } from "./compiler";
import { libraryOrder, soundLibrary } from "./soundLibrary";
import { exportAsset } from "./exportContract";
import { SoundLabAnalysis } from "./SoundLabAnalysis";
import { SoundLabAdvanced } from "./SoundLabAdvanced";
const waves: Waveform[] = ["sine", "square", "sawtooth", "triangle", "noise"];
const S = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <label className="control">
    <span>
      {label}
      <strong>{value}</strong>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
    />
  </label>
);
export function App() {
  const { t, text } = useI18n();
  const [s, setS] = useState<Sound>(defaultSound),
    [prompt, setPrompt] = useState("sci-fi laser"),
    [status, setStatus] = useState("Ready"),
    [dsl, setDsl] = useState(JSON.stringify(defaultSound, null, 2)),
    [metrics, setMetrics] = useState<AudioMetrics | null>(null),
    [report, setReport] = useState<IterationReport | null>(null),
    [pending, setPending] = useState<{
      before: AudioMetrics;
      fix: ReturnType<typeof fixSound>["report"];
    } | null>(null),
    [bursts, setBursts] = useState<SpectralBurst[]>([]),
    [attribution, setAttribution] = useState<LayerAttribution[]>([]),
    [optimization, setOptimization] = useState<OptimizeResult | null>(null),
    [optimizing, setOptimizing] = useState(false),
    [advanced, setAdvanced] = useState(false),
    ctx = useRef<AudioContext | null>(null),
    canvas = useRef<HTMLCanvasElement | null>(null),
    specCanvas = useRef<HTMLCanvasElement | null>(null),
    playback = useRef<null | (() => void)>(null),
    playTimer = useRef(0),
    renderId = useRef(0),
    actionId = useRef(0),
    optimizer = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      renderId.current++;
      actionId.current++;
      optimizer.current?.abort();
      playback.current?.();
      clearTimeout(playTimer.current);
      const c = ctx.current;
      if (c && c.state !== "closed") void c.close();
    },
    [],
  );
  const json = useMemo(() => JSON.stringify(s, null, 2), [s]);
  useEffect(() => setDsl(json), [json]);
  useEffect(() => {
    const id = ++renderId.current;
    renderSound(s).then((b) => {
      if (id !== renderId.current) return;
      const next = inspectBuffer(b);
      setMetrics(next);
      const sp = spectrogram(b);
      setBursts(sp.bursts);
      attributeLayers(s, sp.bursts).then((a) => {
        if (id === renderId.current) setAttribution(a);
      });
      if (specCanvas.current) drawSpectrogram(specCanvas.current, sp);
      if (pending) {
        setReport(
          iterationReport("sound", s.seed, pending.before, next, pending.fix),
        );
        setPending(null);
      }
      const c = canvas.current,
        x = c?.getContext("2d");
      if (!c || !x) return;
      x.clearRect(0, 0, c.width, c.height);
      x.fillStyle = "#080c12";
      x.fillRect(0, 0, c.width, c.height);
      const d = b.getChannelData(0),
        mid = c.height / 2,
        step = Math.max(1, Math.floor(d.length / c.width));
      x.beginPath();
      x.strokeStyle = "#67f3d4";
      for (let px = 0; px < c.width; px++) {
        let peak = 0;
        for (let i = 0; i < step; i++)
          peak = Math.max(peak, Math.abs(d[px * step + i] || 0));
        const y = mid - peak * mid * 0.88;
        px ? x.lineTo(px, y) : x.moveTo(px, y);
      }
      for (let px = c.width - 1; px >= 0; px--) {
        let peak = 0;
        for (let i = 0; i < step; i++)
          peak = Math.max(peak, Math.abs(d[px * step + i] || 0));
        x.lineTo(px, mid + peak * mid * 0.88);
      }
      x.closePath();
      x.globalAlpha = 0.28;
      x.fillStyle = "#67f3d4";
      x.fill();
      x.globalAlpha = 1;
      x.stroke();
    });
  }, [s]);

  const invalidate = () => {
    actionId.current++;
    optimizer.current?.abort();
    optimizer.current = null;
    setOptimizing(false);
    setOptimization(null);
  };
  const patch = (k: keyof SoundDefinition, v: any) => {
    if (s.version === 3) return;
    invalidate();
    setS((x) => (x.version === 2 ? { ...x, [k]: v } : x));
  };
  const lp = (i: number, k: string, v: any) => {
    if (s.version === 3) return;
    invalidate();
    setS((x) =>
      x.version === 2
        ? {
            ...x,
            layers: x.layers.map((l, n) => (n === i ? { ...l, [k]: v } : l)),
          }
        : x,
    );
  };
  function stop() {
    actionId.current++;
    playback.current?.();
    playback.current = null;
    clearTimeout(playTimer.current);
    setStatus("Stopped");
  }
  async function play() {
    stop();
    const c = ctx.current ?? new AudioContext();
    ctx.current = c;
    if (c.state === "suspended") await c.resume();
    playback.current = playSound(c, s);
    setStatus("Playing");
    playTimer.current = window.setTimeout(
      () => {
        playback.current = null;
        setStatus("Ready");
      },
      durationOf(s) * 1000 + 300,
    );
  }
  async function exp() {
    const id = ++actionId.current,
      set = s;
    setStatus("Rendering");
    try {
      await exportAsset(set);
      if (id !== actionId.current) return;
      setStatus("Asset package exported");
      window.setTimeout(() => {
        if (id === actionId.current) setStatus("Ready");
      }, 900);
    } catch (e) {
      if (id === actionId.current)
        setStatus(
          e instanceof Error ? "Export failed: " + e.message : "Export failed",
        );
    }
  }
  function apply() {
    try {
      const r = parseSoundDsl(dsl);
      invalidate();
      setS(r.value);
      setStatus(
        r.migrated
          ? "DSL v" + r.fromVersion + " migrated to v2"
          : "IR/DSL v" + r.fromVersion + " loaded",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invalid RESONA DSL");
    }
  }
  function autoFix() {
    if (!metrics) return;
    const r = fixSound(s, metrics);
    setPending({ before: metrics, fix: r.report });
    setS(r.value);
    setStatus(
      r.report.gainScale < 1
        ? "Auto-fix: gain " + Math.round(r.report.gainScale * 100) + "%"
        : "Inspector: no gain fix needed",
    );
  }
  async function optimize() {
    optimizer.current?.abort();
    const ctl = new AbortController();
    optimizer.current = ctl;
    const id = ++actionId.current,
      input = s;
    setOptimizing(true);
    setStatus("Agent optimizing");
    try {
      const r = await optimizeSound(input, 4, ctl.signal);
      if (id !== actionId.current || ctl.signal.aborted) return;
      setOptimization(r);
      setS(r.value);
      setStatus(r.verified ? "Optimization verified" : r.stopReason);
    } catch (e) {
      if (id === actionId.current && !ctl.signal.aborted)
        setStatus(
          e instanceof Error
            ? "Optimize failed: " + e.message
            : "Optimize failed",
        );
    } finally {
      if (id === actionId.current) {
        setOptimizing(false);
        optimizer.current = null;
      }
    }
  }
  function surgical() {
    const r = surgicalFix(s, attribution);
    invalidate();
    setS(r.value);
    setStatus(r.action);
  }
  function vary() {
    invalidate();
    setS((x) =>
      x.version === 3
        ? { ...x, seed: x.seed + 1, name: x.name + " Variant" }
        : {
            ...x,
            name: x.name + " Variant",
            masterGain: x.masterGain ?? 0.82,
            limiter: x.limiter !== false,
            filterFrequency: Math.round(
              x.filterFrequency * (0.88 + Math.random() * 0.24),
            ),
            layers: x.layers.map((l) => ({
              ...l,
              frequency: Math.max(
                20,
                Math.round(l.frequency * (0.94 + Math.random() * 0.12)),
              ),
              detune: Math.round(l.detune + (Math.random() - 0.5) * 12),
              gain: +Math.max(
                0.01,
                l.gain * (0.9 + Math.random() * 0.2),
              ).toFixed(3),
            })),
          },
    );
    setStatus("Variation generated");
  }
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <div>
            <h1>RESONA</h1>
            <p>{t("sound.workbench")}</p>
          </div>
        </div>
        <div className="actions">
          <button onClick={vary}>
            <Shuffle size={15} />
            {t("sound.variation")}
          </button>
          <button disabled={optimizing} onClick={optimize}>
            <Sparkles size={15} />
            {t(optimizing ? "sound.optimizing" : "sound.optimize")}
          </button>
          <button onClick={exp}>
            <Download size={15} />
            {t("common.export")}
          </button>
          <button onClick={stop}>
            <Square size={15} />
            {t("common.stop")}
          </button>
          <button className="primary" onClick={play}>
            <Play size={15} />
            {t("common.play")}
          </button>
        </div>
      </header>
      <section className="promptbar">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              invalidate();
              setS(compileSound(prompt).sound);
            }
          }}
        />
        <button
          className="primary"
          onClick={() => {
            invalidate();
            setS(compileSound(prompt).sound);
          }}
        >
          {t("sound.generate")}
        </button>
      </section>
      <section className="flowbar">
        <span>{t("sound.flow.describe")}</span>
        <span>{t("sound.flow.generate")}</span>
        <span>{t("sound.flow.inspect")}</span>
        <span>{t("sound.flow.optimize")}</span>
        <span>{t("sound.flow.export")}</span>
        <button onClick={() => setAdvanced((x) => !x)}>
          {t(advanced ? "sound.hideAdvanced" : "sound.advanced")}
        </button>
      </section>
      <section className="presetbar">
        <span>
          <Library size={15} />
          {t("sound.presets")}
        </span>
        {libraryOrder.map((id) => (
          <button
            key={id}
            onClick={() => {
              invalidate();
              setS(structuredClone(soundLibrary[id]));
            }}
          >
            {soundLibrary[id].name}
          </button>
        ))}
      </section>
      <section className="presetbar physical">
        <span>
          <Library size={15} />
          {text("Physical")} · IR v3
        </span>
        {physicalOrder.map((id) => (
          <button
            key={id}
            className={
              s.version === 3 && s.name === physicalLibrary[id].name
                ? "active"
                : ""
            }
            onClick={() => {
              invalidate();
              setS(structuredClone(physicalLibrary[id]));
              setStatus("IR v3 physical program loaded");
            }}
          >
            {physicalLibrary[id].name}
          </button>
        ))}
      </section>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">{t("sound.agentReady")}</p>
          <h2>{s.name}</h2>
          <p className="subtitle">
            {t("sound.subtitle")}
          </p>
        </div>
        <div className="status">{text(status)}</div>
      </section>
      <SoundLabAnalysis
        sound={s}
        metrics={metrics}
        report={report}
        optimization={optimization}
        bursts={bursts}
        attribution={attribution}
        waveformRef={canvas}
        spectrogramRef={specCanvas}
        onAutoFix={autoFix}
        onSurgicalFix={surgical}
      />{" "}
      <SoundLabAdvanced
        advanced={advanced}
        s={s}
        dsl={dsl}
        setS={setS}
        invalidate={invalidate}
        patch={patch}
        lp={lp}
        setDsl={setDsl}
        apply={apply}
        setStatus={setStatus}
      />{" "}
      <footer>
        <span>RESONA v0.2.0 · IR v3</span>
        <span>
          Modal · Karplus–Strong · grains · procedural room · deterministic
          seeds
        </span>
      </footer>
    </main>
  );
}
