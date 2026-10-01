import { useI18n } from "./i18n";
import { Copy, Plus, Trash2, Upload } from "lucide-react";
import type { Sound, SoundDefinition, Waveform } from "./audio";
import { ProgramPanel } from "./ProgramPanel";

const waves: Waveform[] = ["sine", "square", "sawtooth", "triangle", "noise"];
const Slider = ({
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
  onChange: (value: number) => void;
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
      onChange={(event) => onChange(+event.target.value)}
    />
  </label>
);
const S = Slider;

type Props = {
  advanced: boolean;
  s: Sound;
  dsl: string;
  setS: (sound: Sound) => void;
  invalidate: () => void;
  patch: (key: keyof SoundDefinition, value: any) => void;
  lp: (index: number, key: string, value: any) => void;
  setDsl: (value: string) => void;
  apply: () => void;
  setStatus: (value: string) => void;
};

export function SoundLabAdvanced({
  advanced,
  s,
  dsl,
  setS,
  invalidate,
  patch,
  lp,
  setDsl,
  apply,
  setStatus,
}: Props) {
  const { t, text } = useI18n();
  if (!advanced) return null;
  return (
    <>
      <section className="grid engine-grid">
        {s.version === 3 ? (
          <ProgramPanel
            p={s}
            onChange={(p) => {
              invalidate();
              setS(p);
            }}
          />
        ) : (
          <>
            <div className="panel">
              <div className="panel-title">
                <span>{t("sound.layers")}</span>
                <button
                  className="mini"
                  onClick={() =>
                    patch("layers", [
                      ...s.layers,
                      {
                        id: "layer-" + (s.layers.length + 1),
                        waveform: "sine",
                        frequency: 440,
                        detune: 0,
                        gain: 0.1,
                        pitchDrop: 0,
                        filterFrequency: 12000,
                        filterQ: 0.7,
                        fmAmount: 0,
                        fmRatio: 2,
                        lfo: {
                          waveform: "sine",
                          rate: 5,
                          target: "pitch",
                          pitchDepthCents: 0,
                          filterDepthHz: 0,
                          gainDepth: 0,
                        },
                        pitchEnvelope: {
                          attack: 0.01,
                          decay: 0.25,
                          amount: 0,
                        },
                        filterEnvelope: {
                          attack: 0.01,
                          decay: 0.3,
                          amount: 0,
                        },
                      },
                    ])
                  }
                >
                  <Plus size={14} />
                  {t("sound.addLayer")}
                </button>
              </div>
              {s.layers.map((l, i) => (
                <div className="layer" key={i}>
                  <div className="layer-head">
                    <input
                      value={l.id}
                      onChange={(e) => lp(i, "id", e.target.value)}
                    />
                    <button
                      className="icon"
                      disabled={s.layers.length === 1}
                      onClick={() =>
                        patch(
                          "layers",
                          s.layers.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="wave-selector">
                    {waves.map((w) => (
                      <button
                        key={w}
                        className={l.waveform === w ? "active" : ""}
                        onClick={() => lp(i, "waveform", w)}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  {l.waveform !== "noise" && (
                    <>
                      <S
                        label="Frequency Hz"
                        value={l.frequency}
                        min={30}
                        max={2400}
                        step={1}
                        onChange={(v) => lp(i, "frequency", v)}
                      />
                      <S
                        label="Pitch drop Hz"
                        value={l.pitchDrop}
                        min={0}
                        max={2000}
                        step={1}
                        onChange={(v) => lp(i, "pitchDrop", v)}
                      />
                    </>
                  )}
                  <S
                    label="Layer filter Hz"
                    value={l.filterFrequency ?? 12000}
                    min={300}
                    max={18000}
                    step={50}
                    onChange={(v) => lp(i, "filterFrequency", v)}
                  />
                  <S
                    label="FM amount Hz"
                    value={l.fmAmount ?? 0}
                    min={0}
                    max={1200}
                    step={5}
                    onChange={(v) => lp(i, "fmAmount", v)}
                  />
                  <S
                    label="FM ratio"
                    value={l.fmRatio ?? 2}
                    min={0.25}
                    max={8}
                    step={0.25}
                    onChange={(v) => lp(i, "fmRatio", v)}
                  />
                  <div className="mod-row">
                    <select
                      value={l.lfo?.target ?? "pitch"}
                      onChange={(e) =>
                        lp(i, "lfo", {
                          ...(l.lfo ?? {
                            waveform: "sine",
                            rate: 5,
                            pitchDepthCents: 0,
                            filterDepthHz: 0,
                            gainDepth: 0,
                          }),
                          target: e.target.value,
                        })
                      }
                    >
                      <option value="pitch">LFO → pitch</option>
                      <option value="filter">LFO → filter</option>
                      <option value="gain">LFO → gain</option>
                    </select>
                    <select
                      value={l.lfo?.waveform ?? "sine"}
                      onChange={(e) =>
                        lp(i, "lfo", {
                          ...(l.lfo ?? {
                            rate: 5,
                            target: "pitch",
                            pitchDepthCents: 0,
                            filterDepthHz: 0,
                            gainDepth: 0,
                          }),
                          waveform: e.target.value,
                        })
                      }
                    >
                      {["sine", "triangle", "square", "sawtooth"].map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <S
                    label="LFO rate Hz"
                    value={l.lfo?.rate ?? 5}
                    min={0.1}
                    max={40}
                    step={0.1}
                    onChange={(v) =>
                      lp(i, "lfo", {
                        ...(l.lfo ?? {
                          waveform: "sine",
                          target: "pitch",
                          pitchDepthCents: 0,
                          filterDepthHz: 0,
                          gainDepth: 0,
                        }),
                        rate: v,
                      })
                    }
                  />
                  {(l.lfo?.target ?? "pitch") === "pitch" ? (
                    <S
                      label="LFO depth cents"
                      value={l.lfo?.pitchDepthCents ?? 0}
                      min={0}
                      max={1200}
                      step={1}
                      onChange={(v) =>
                        lp(i, "lfo", {
                          ...(l.lfo ?? {
                            waveform: "sine",
                            rate: 5,
                            target: "pitch",
                            filterDepthHz: 0,
                            gainDepth: 0,
                          }),
                          pitchDepthCents: v,
                        })
                      }
                    />
                  ) : l.lfo?.target === "filter" ? (
                    <S
                      label="LFO depth Hz"
                      value={l.lfo?.filterDepthHz ?? 0}
                      min={0}
                      max={12000}
                      step={10}
                      onChange={(v) =>
                        lp(i, "lfo", {
                          ...(l.lfo ?? {
                            waveform: "sine",
                            rate: 5,
                            target: "filter",
                            pitchDepthCents: 0,
                            gainDepth: 0,
                          }),
                          filterDepthHz: v,
                        })
                      }
                    />
                  ) : (
                    <S
                      label="LFO depth gain"
                      value={l.lfo?.gainDepth ?? 0}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) =>
                        lp(i, "lfo", {
                          ...(l.lfo ?? {
                            waveform: "sine",
                            rate: 5,
                            target: "gain",
                            pitchDepthCents: 0,
                            filterDepthHz: 0,
                          }),
                          gainDepth: v,
                        })
                      }
                    />
                  )}
                  <S
                    label="Pitch env cents"
                    value={l.pitchEnvelope?.amount ?? 0}
                    min={-2400}
                    max={2400}
                    step={10}
                    onChange={(v) =>
                      lp(i, "pitchEnvelope", {
                        ...(l.pitchEnvelope ?? {
                          attack: 0.01,
                          decay: 0.25,
                        }),
                        amount: v,
                      })
                    }
                  />
                  <S
                    label="Filter env Hz"
                    value={l.filterEnvelope?.amount ?? 0}
                    min={-12000}
                    max={12000}
                    step={20}
                    onChange={(v) =>
                      lp(i, "filterEnvelope", {
                        ...(l.filterEnvelope ?? {
                          attack: 0.01,
                          decay: 0.3,
                        }),
                        amount: v,
                      })
                    }
                  />
                  <S
                    label="Gain"
                    value={l.gain}
                    min={0.01}
                    max={0.6}
                    step={0.01}
                    onChange={(v) => lp(i, "gain", v)}
                  />
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="panel-title">
                <span>{t("sound.masterDsp")}</span>
                <small>{t("sound.fxChain")}</small>
              </div>
              <S
                label="Master gain"
                value={s.masterGain ?? 1}
                min={0.05}
                max={1.5}
                step={0.01}
                onChange={(v) => patch("masterGain", v)}
              />
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={s.limiter !== false}
                  onChange={(e) => patch("limiter", e.target.checked)}
                />
                Master limiter
              </label>
              <S
                label="Duration s"
                value={s.duration}
                min={0.1}
                max={4}
                step={0.01}
                onChange={(v) => patch("duration", v)}
              />
              <S
                label="Filter Hz"
                value={s.filterFrequency}
                min={120}
                max={12000}
                step={10}
                onChange={(v) => patch("filterFrequency", v)}
              />
              <S
                label="Resonance"
                value={s.filterQ}
                min={0}
                max={18}
                step={0.1}
                onChange={(v) => patch("filterQ", v)}
              />
              <S
                label="Distortion"
                value={s.distortion}
                min={0}
                max={40}
                step={1}
                onChange={(v) => patch("distortion", v)}
              />
              <S
                label="Delay mix"
                value={s.delay}
                min={0}
                max={0.65}
                step={0.01}
                onChange={(v) => patch("delay", v)}
              />
              <hr />
              <S
                label="Attack"
                value={s.attack}
                min={0.001}
                max={0.8}
                step={0.001}
                onChange={(v) => patch("attack", v)}
              />
              <S
                label="Decay"
                value={s.decay}
                min={0.001}
                max={1}
                step={0.001}
                onChange={(v) => patch("decay", v)}
              />
              <S
                label="Sustain"
                value={s.sustain}
                min={0.01}
                max={1}
                step={0.01}
                onChange={(v) => patch("sustain", v)}
              />
              <S
                label="Release"
                value={s.release}
                min={0.001}
                max={1.5}
                step={0.001}
                onChange={(v) => patch("release", v)}
              />
            </div>
          </>
        )}
        <div className="panel code-panel">
          <div className="panel-title">
            <span>{t("sound.dsl")}</span>
            <small>{t("sound.dslContract")}</small>
          </div>
          <textarea value={dsl} onChange={(e) => setDsl(e.target.value)} />
          <div className="dsl-actions">
            <button onClick={apply}>
              <Upload size={14} />
              {t("sound.loadJson")}
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(dsl);
                setStatus("DSL copied");
              }}
            >
              <Copy size={14} />
              {t("common.copyJson")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
