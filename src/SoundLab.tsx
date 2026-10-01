import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Play, Square, Sparkles, Trash2, Plus, Copy, Shuffle, Upload, Library } from 'lucide-react';
import { defaultSound, playSound, renderSound } from './audio';
import type { SoundDefinition, Waveform } from './audio';
import { fmtDb, fmtPct, inspectBuffer } from './inspector';
import type { AudioMetrics } from './inspector';
import { fixSound } from './autofix';
import { downloadReport, iterationReport } from './report';
import type { IterationReport } from './report';
import { drawSpectrogram, spectrogram } from './spectrogram';
import type { SpectralBurst, Spectrogram } from './spectrogram';
import { attributeLayers, surgicalFix } from './attribution';
import type { LayerAttribution } from './attribution';
import { downloadOptimization, optimizeSound } from './optimizer';
import type { OptimizeResult } from './optimizer';
import { parseSoundDsl } from './schema';
import { compileSound } from './compiler';
import { libraryOrder, soundLibrary } from './soundLibrary';
import { exportAsset } from './exportContract';
import { useI18n } from './i18n';

const waves: Waveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];
const MAX_DPR = 2.5;
const ANALYSIS_DEBOUNCE_MS = 200;
const ATTRIBUTION_DEBOUNCE_MS = 240;

type PendingRepair = { before: AudioMetrics; fix: ReturnType<typeof fixSound>['report'] };
type CommitOptions = {
  status?: string;
  repair?: PendingRepair | null;
  optimization?: OptimizeResult | null;
  preserveVariationIndex?: boolean;
};

const S = ({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <label className="control">
    <span>{label}<strong>{value}</strong></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
  </label>
);

function syncCanvasResolution(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return dpr;
}

function drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer) {
  const dpr = syncCanvasResolution(canvas);
  const x = canvas.getContext('2d');
  if (!x) return;
  const width = canvas.width;
  const height = canvas.height;
  x.clearRect(0, 0, width, height);
  x.fillStyle = '#080c12';
  x.fillRect(0, 0, width, height);
  const d = buffer.getChannelData(0);
  const mid = height / 2;
  const step = Math.max(1, Math.floor(d.length / width));
  x.beginPath();
  x.strokeStyle = '#67f3d4';
  x.lineWidth = Math.max(1, dpr);
  for (let px = 0; px < width; px++) {
    let peak = 0;
    for (let i = 0; i < step; i++) peak = Math.max(peak, Math.abs(d[px * step + i] || 0));
    const y = mid - peak * mid * .88;
    px ? x.lineTo(px, y) : x.moveTo(px, y);
  }
  for (let px = width - 1; px >= 0; px--) {
    let peak = 0;
    for (let i = 0; i < step; i++) peak = Math.max(peak, Math.abs(d[px * step + i] || 0));
    x.lineTo(px, mid + peak * mid * .88);
  }
  x.closePath();
  x.globalAlpha = .28;
  x.fillStyle = '#67f3d4';
  x.fill();
  x.globalAlpha = 1;
  x.stroke();
}

function makePrng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function variationSeed(seed: number, index: number) {
  return (Math.imul(seed >>> 0, 1664525) + Math.imul(index, 1013904223)) >>> 0;
}

export function App() {
  const { locale, t } = useI18n();
  const bi = (zh: string, en: string) => locale === 'zh-TW' ? `${zh} ${en}` : en;
  const [s, setS] = useState(defaultSound);
  const [prompt, setPrompt] = useState('sci-fi laser');
  const [status, setStatus] = useState(() => t('common.ready'));
  const [dsl, setDsl] = useState(JSON.stringify(defaultSound, null, 2));
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [report, setReport] = useState<IterationReport | null>(null);
  const [bursts, setBursts] = useState<SpectralBurst[]>([]);
  const [attribution, setAttribution] = useState<LayerAttribution[]>([]);
  const [optimization, setOptimization] = useState<OptimizeResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const ctx = useRef<AudioContext | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const specCanvas = useRef<HTMLCanvasElement | null>(null);
  const playback = useRef<null | (() => void)>(null);
  const playTimer = useRef(0);
  const renderRun = useRef(0);
  const soundRevision = useRef(0);
  const optimizer = useRef<AbortController | null>(null);
  const exportRun = useRef(0);
  const pendingRepair = useRef<PendingRepair | null>(null);
  const lastBuffer = useRef<AudioBuffer | null>(null);
  const lastSpectrogram = useRef<Spectrogram | null>(null);
  const variationIndex = useRef(0);

  const json = useMemo(() => JSON.stringify(s, null, 2), [s]);
  useEffect(() => setDsl(json), [json]);

  function stopPlayback(nextStatus = t('common.stopped')) {
    playback.current?.();
    playback.current = null;
    clearTimeout(playTimer.current);
    setStatus(nextStatus);
  }

  function cancelOptimization() {
    optimizer.current?.abort();
    optimizer.current = null;
    setOptimizing(false);
  }

  function commitSound(next: SoundDefinition, options: CommitOptions = {}) {
    soundRevision.current++;
    renderRun.current++;
    exportRun.current++;
    cancelOptimization();
    pendingRepair.current = options.repair ?? null;
    if (!options.repair) setReport(null);
    setOptimization(options.optimization ?? null);
    if (!options.preserveVariationIndex) variationIndex.current = 0;
    setS(next);
    if (options.status) setStatus(options.status);
  }

  function patch<K extends keyof SoundDefinition>(key: K, value: SoundDefinition[K]) {
    commitSound({ ...s, [key]: value });
  }

  function lp(index: number, key: string, value: any) {
    commitSound({ ...s, layers: s.layers.map((layer, i) => i === index ? { ...layer, [key]: value } : layer) });
  }

  function redrawVisuals() {
    if (canvas.current && lastBuffer.current) drawWaveform(canvas.current, lastBuffer.current);
    if (specCanvas.current && lastSpectrogram.current) {
      syncCanvasResolution(specCanvas.current);
      drawSpectrogram(specCanvas.current, lastSpectrogram.current);
    }
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => redrawVisuals());
    if (canvas.current) observer.observe(canvas.current);
    if (specCanvas.current) observer.observe(specCanvas.current);
    redrawVisuals();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const run = ++renderRun.current;
    let attributionTimer = 0;
    const analysisTimer = window.setTimeout(() => {
      renderSound(s).then(buffer => {
        if (run !== renderRun.current) return;
        lastBuffer.current = buffer;
        const next = inspectBuffer(buffer);
        setMetrics(next);
        const sp = spectrogram(buffer, 192, 96);
        lastSpectrogram.current = sp;
        setBursts(sp.bursts);
        redrawVisuals();

        attributionTimer = window.setTimeout(() => {
          if (run !== renderRun.current) return;
          attributeLayers(s, sp.bursts).then(a => {
            if (run === renderRun.current) setAttribution(a);
          });
        }, ATTRIBUTION_DEBOUNCE_MS);

        const repair = pendingRepair.current;
        if (repair) {
          setReport(iterationReport('sound', s.seed, repair.before, next, repair.fix));
          pendingRepair.current = null;
        }
      });
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(analysisTimer);
      window.clearTimeout(attributionTimer);
    };
  }, [s]);

  useEffect(() => () => {
    renderRun.current++;
    exportRun.current++;
    cancelOptimization();
    playback.current?.();
    clearTimeout(playTimer.current);
    const c = ctx.current;
    if (c && c.state !== 'closed') void c.close();
  }, []);

  async function play() {
    stopPlayback(t('common.ready'));
    const c = ctx.current ?? new AudioContext();
    ctx.current = c;
    if (c.state === 'suspended') await c.resume();
    playback.current = playSound(c, s);
    setStatus(t('common.playing'));
    playTimer.current = window.setTimeout(() => {
      playback.current = null;
      setStatus(t('common.ready'));
    }, s.duration * 1000 + 300);
  }

  async function exp() {
    const id = ++exportRun.current;
    const revision = soundRevision.current;
    const snapshot = s;
    setStatus(t('sound.exportRendering'));
    try {
      await exportAsset(snapshot);
      if (id !== exportRun.current || revision !== soundRevision.current) return;
      setStatus(t('sound.exported'));
      window.setTimeout(() => {
        if (id === exportRun.current && revision === soundRevision.current) setStatus(t('common.ready'));
      }, 900);
    } catch (e) {
      if (id === exportRun.current && revision === soundRevision.current) {
        setStatus(e instanceof Error ? `${t('sound.exportFailed')}: ${e.message}` : t('sound.exportFailed'));
      }
    }
  }

  function generate() {
    const result = compileSound(prompt);
    const i = result.intent;
    commitSound(result.sound, {
      status: `${t('sound.compiled')}: ${i.category} · ${i.material} · ${i.character} · ${i.duration}`,
    });
  }

  function apply() {
    try {
      const r = parseSoundDsl(dsl);
      commitSound(r.value, { status: r.migrated ? `DSL v${r.fromVersion} → v2` : t('sound.dslLoaded') });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t('sound.dslInvalid'));
    }
  }

  function autoFix() {
    if (!metrics) return;
    const r = fixSound(s, metrics);
    commitSound(r.value, {
      repair: { before: metrics, fix: r.report },
      status: r.report.gainScale < 1 ? `${t('sound.autoFix')}: ${bi('增益', 'gain')} ${Math.round(r.report.gainScale * 100)}%` : t('sound.autoFixNoNeed'),
    });
  }

  async function optimize() {
    cancelOptimization();
    const ctl = new AbortController();
    optimizer.current = ctl;
    const input = s;
    const revision = soundRevision.current;
    setOptimizing(true);
    setStatus(t('sound.optimizingStatus'));
    try {
      const r = await optimizeSound(input, 4, ctl.signal);
      if (optimizer.current !== ctl || ctl.signal.aborted || revision !== soundRevision.current) return;
      optimizer.current = null;
      setOptimizing(false);
      commitSound(r.value, {
        optimization: r,
        status: r.verified ? t('sound.optimizationVerified') : r.stopReason,
      });
    } catch (e) {
      if (optimizer.current === ctl && !ctl.signal.aborted) {
        setStatus(e instanceof Error ? `${t('sound.optimizeFailed')}: ${e.message}` : t('sound.optimizeFailed'));
      }
    } finally {
      if (optimizer.current === ctl) {
        optimizer.current = null;
        setOptimizing(false);
      }
    }
  }

  function surgical() {
    const r = surgicalFix(s, attribution);
    commitSound(r.value, { status: r.action });
  }

  function vary() {
    const index = variationIndex.current + 1;
    const random = makePrng(variationSeed(s.seed, index));
    const baseName = s.name.replace(/ Variant #\d+$/, '');
    const next: SoundDefinition = {
      ...s,
      name: `${baseName} Variant #${index}`,
      masterGain: s.masterGain ?? .82,
      limiter: s.limiter !== false,
      filterFrequency: Math.round(s.filterFrequency * (.88 + random() * .24)),
      layers: s.layers.map(layer => ({
        ...layer,
        frequency: Math.max(20, Math.round(layer.frequency * (.94 + random() * .12))),
        detune: Math.round(layer.detune + (random() - .5) * 12),
        gain: +Math.max(.01, layer.gain * (.9 + random() * .2)).toFixed(3),
      })),
    };
    variationIndex.current = index;
    commitSound(next, { status: `${t('sound.deterministicVariation')} #${index}`, preserveVariationIndex: true });
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><div><h1>RESONA</h1><p>{t('sound.workbench')}</p></div></div>
      <div className="actions">
        <button onClick={vary}><Shuffle size={15} />{t('sound.variation')}</button>
        <button disabled={optimizing} onClick={optimize}><Sparkles size={15} />{optimizing ? t('sound.optimizing') : t('sound.optimize')}</button>
        <button onClick={exp}><Download size={15} />{t('common.export')}</button>
        <button onClick={() => stopPlayback()}><Square size={15} />{t('common.stop')}</button>
        <button className="primary" onClick={play}><Play size={15} />{t('common.play')}</button>
      </div>
    </header>

    <section className="promptbar">
      <input aria-label={t('sound.flow.describe')} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') generate(); }} />
      <button className="primary" onClick={generate}>{t('sound.generate')}</button>
    </section>

    <section className="flowbar"><span>{t('sound.flow.describe')}</span><span>{t('sound.flow.generate')}</span><span>{t('sound.flow.inspect')}</span><span>{t('sound.flow.optimize')}</span><span>{t('sound.flow.export')}</span><button onClick={() => setAdvanced(x => !x)}>{advanced ? t('sound.hideAdvanced') : t('sound.advanced')}</button></section>
    <section className="presetbar"><span><Library size={15} />{t('sound.presets')}</span>{libraryOrder.map(id => <button key={id} onClick={() => commitSound(structuredClone(soundLibrary[id]), { status: `${t('sound.presetLoaded')}: ${soundLibrary[id].name}` })}>{soundLibrary[id].name}</button>)}</section>
    <section className="hero-panel"><div><p className="eyebrow">{t('sound.agentReady')}</p><h2>{s.name}</h2><p className="subtitle">{t('sound.subtitle')}</p></div><div className="status">{status}</div></section>

    {optimization && <section className="optimizer panel"><div className="panel-title"><span>{t('sound.optimize')} <button className="mini" onClick={() => downloadOptimization(optimization, s.name)}>JSON</button></span><small className={optimization.verified ? 'clean' : 'warning'}>{optimization.verified ? 'VERIFIED' : optimization.stopReason}</small></div><div className="opt-steps">{optimization.steps.map(x => <div key={x.iteration}><strong>#{x.iteration} · {x.issue}</strong><span>{x.action}</span><code>{x.before.peakDb.toFixed(1)} → {x.after.peakDb.toFixed(1)} dB · clipped {x.before.clipped} → {x.after.clipped}{x.target ? ' · ' + x.target : ''}</code></div>)}</div></section>}

    <section className="inspector panel"><div className="panel-title"><span>{t('sound.inspector')} · seed {s.seed} <button className="mini fix" disabled={!metrics || metrics.status === 'clean'} onClick={autoFix}>{t('sound.autoFix')}</button></span><small className={metrics?.status}>{metrics?.status ?? t('common.rendering')}</small></div><div className="metric-grid"><div><small>{t('metric.peak')}</small><strong>{metrics ? fmtDb(metrics.peakDb) : '—'}</strong></div><div><small>{t('metric.rms')}</small><strong>{metrics ? fmtDb(metrics.rmsDb) : '—'}</strong></div><div><small>{t('metric.crest')}</small><strong>{metrics ? metrics.crestDb.toFixed(1) + ' dB' : '—'}</strong></div><div><small>{t('metric.dc')}</small><strong>{metrics ? metrics.dc.toFixed(4) : '—'}</strong></div><div><small>{t('metric.clipped')}</small><strong>{metrics?.clipped ?? '—'}</strong></div></div><div className="spectral-grid"><div><small>{t('metric.centroid')}</small><strong>{metrics ? Math.round(metrics.centroidHz) + ' Hz' : '—'}</strong></div><div><small>{t('metric.sub')}</small><strong>{metrics ? fmtPct(metrics.lowRatio) : '—'}</strong></div><div><small>{t('metric.air')}</small><strong>{metrics ? fmtPct(metrics.highRatio) : '—'}</strong></div></div>{metrics?.issues.length ? <div className="issues">{metrics.issues.map(x => <span key={x}>{x}</span>)}</div> : <div className="issues clean">{t('sound.noAnomaly')}</div>}</section>

    {report && <section className="iteration panel"><div className="panel-title"><span>{t('sound.iterationReport')}</span><button className="mini" onClick={() => downloadReport(report, s.name)}>{t('common.jsonReport')}</button></div><div className="iteration-row"><strong>{report.verified ? 'VERIFIED' : 'REVIEW'}</strong><span>{t('metric.peak')} {report.before.peakDb.toFixed(1)} → {report.after.peakDb.toFixed(1)} dB</span><span>{t('metric.clipped')} {report.before.clipped} → {report.after.clipped}</span><span>{bi('增益', 'Gain')} × {report.fix.gainScale.toFixed(3)}</span></div></section>}

    <section className="spectrogram-panel panel"><div className="panel-title"><span>{t('sound.timeFrequency')}</span><small>{bursts.length ? `${bursts.length} burst${bursts.length > 1 ? 's' : ''}` : t('sound.noBursts')}</small></div><canvas ref={specCanvas} width={1200} height={260} role="img" aria-label={t('sound.timeFrequency')} />{bursts.length > 0 && <div className="burst-list">{bursts.map((b, i) => <span key={i}>{Math.round(b.startMs)}–{Math.round(b.endMs)} ms · {Math.round(b.lowHz / 1000)}–{Math.round(b.highHz / 1000)} kHz · ×{b.score.toFixed(1)}</span>)}</div>}</section>

    <section className="attribution panel"><div className="panel-title"><span>{t('sound.layerAttribution')}</span><button className="mini fix" disabled={!attribution[0] || attribution[0].score < .08} onClick={surgical}>{t('sound.surgicalFix')}</button></div>{attribution.map((a, i) => <div className={'suspect ' + (i === 0 ? 'top' : '')} key={a.layerId}><strong>{i === 0 ? 'SUSPECT · ' : ''}{a.layerId}</strong><span>{a.reason}</span><code>Matched energy {(a.highRatio * 100).toFixed(1)}% · windows {a.burstCount} · score {a.score.toFixed(3)}</code></div>)}</section>

    <section className="wave-panel panel"><div className="panel-title"><span>{t('sound.waveform')}</span><small>{t('sound.waveformMeta')}</small></div><canvas ref={canvas} width={1200} height={180} role="img" aria-label={t('sound.waveform')} /></section>

    {advanced && <><section className="grid engine-grid"><div className="panel"><div className="panel-title"><span>{t('sound.layers')}</span><button className="mini" onClick={() => patch('layers', [...s.layers, { id: 'layer-' + (s.layers.length + 1), waveform: 'sine', frequency: 440, detune: 0, gain: .1, pitchDrop: 0, filterFrequency: 12000, filterQ: .7, fmAmount: 0, fmRatio: 2, lfo: { waveform: 'sine', rate: 5, target: 'pitch', pitchDepthCents: 0, filterDepthHz: 0, gainDepth: 0 }, pitchEnvelope: { attack: .01, decay: .25, amount: 0 }, filterEnvelope: { attack: .01, decay: .3, amount: 0 } }])}><Plus size={14} />{t('sound.addLayer')}</button></div>{s.layers.map((l, i) => <div className="layer" key={i}><div className="layer-head"><input value={l.id} onChange={e => lp(i, 'id', e.target.value)} /><button className="icon" aria-label={`${t('sound.deleteLayer')} ${l.id}`} disabled={s.layers.length === 1} onClick={() => patch('layers', s.layers.filter((_, n) => n !== i))}><Trash2 size={14} /></button></div><div className="wave-selector">{waves.map(w => <button key={w} className={l.waveform === w ? 'active' : ''} onClick={() => lp(i, 'waveform', w)}>{w}</button>)}</div>{l.waveform !== 'noise' && <><S label={bi('頻率', 'Frequency Hz')} value={l.frequency} min={30} max={2400} step={1} onChange={v => lp(i, 'frequency', v)} /><S label={bi('音高下降', 'Pitch drop Hz')} value={l.pitchDrop} min={0} max={2000} step={1} onChange={v => lp(i, 'pitchDrop', v)} /></>}<S label={bi('Layer 濾波', 'Layer filter Hz')} value={l.filterFrequency ?? 12000} min={300} max={18000} step={50} onChange={v => lp(i, 'filterFrequency', v)} /><S label={bi('FM 量', 'FM amount Hz')} value={l.fmAmount ?? 0} min={0} max={1200} step={5} onChange={v => lp(i, 'fmAmount', v)} /><S label={bi('FM 比率', 'FM ratio')} value={l.fmRatio ?? 2} min={.25} max={8} step={.25} onChange={v => lp(i, 'fmRatio', v)} /><div className="mod-row"><select value={l.lfo?.target ?? 'pitch'} onChange={e => lp(i, 'lfo', { ...(l.lfo ?? { waveform: 'sine', rate: 5, pitchDepthCents: 0, filterDepthHz: 0, gainDepth: 0 }), target: e.target.value })}><option value="pitch">LFO → pitch</option><option value="filter">LFO → filter</option><option value="gain">LFO → gain</option></select><select value={l.lfo?.waveform ?? 'sine'} onChange={e => lp(i, 'lfo', { ...(l.lfo ?? { rate: 5, target: 'pitch', pitchDepthCents: 0, filterDepthHz: 0, gainDepth: 0 }), waveform: e.target.value })}>{['sine', 'triangle', 'square', 'sawtooth'].map(w => <option key={w}>{w}</option>)}</select></div><S label={bi('LFO 速率', 'LFO rate Hz')} value={l.lfo?.rate ?? 5} min={.1} max={40} step={.1} onChange={v => lp(i, 'lfo', { ...(l.lfo ?? { waveform: 'sine', target: 'pitch', pitchDepthCents: 0, filterDepthHz: 0, gainDepth: 0 }), rate: v })} />{(l.lfo?.target ?? 'pitch') === 'pitch' ? <S label={bi('LFO 深度', 'LFO depth cents')} value={l.lfo?.pitchDepthCents ?? 0} min={0} max={1200} step={1} onChange={v => lp(i, 'lfo', { ...(l.lfo ?? { waveform: 'sine', rate: 5, target: 'pitch', filterDepthHz: 0, gainDepth: 0 }), pitchDepthCents: v })} /> : l.lfo?.target === 'filter' ? <S label={bi('LFO 深度', 'LFO depth Hz')} value={l.lfo?.filterDepthHz ?? 0} min={0} max={12000} step={10} onChange={v => lp(i, 'lfo', { ...(l.lfo ?? { waveform: 'sine', rate: 5, target: 'filter', pitchDepthCents: 0, gainDepth: 0 }), filterDepthHz: v })} /> : <S label={bi('LFO 增益深度', 'LFO depth gain')} value={l.lfo?.gainDepth ?? 0} min={0} max={1} step={.01} onChange={v => lp(i, 'lfo', { ...(l.lfo ?? { waveform: 'sine', rate: 5, target: 'gain', pitchDepthCents: 0, filterDepthHz: 0 }), gainDepth: v })} />}<S label={bi('音高包絡', 'Pitch env cents')} value={l.pitchEnvelope?.amount ?? 0} min={-2400} max={2400} step={10} onChange={v => lp(i, 'pitchEnvelope', { ...(l.pitchEnvelope ?? { attack: .01, decay: .25 }), amount: v })} /><S label={bi('濾波包絡', 'Filter env Hz')} value={l.filterEnvelope?.amount ?? 0} min={-12000} max={12000} step={20} onChange={v => lp(i, 'filterEnvelope', { ...(l.filterEnvelope ?? { attack: .01, decay: .3 }), amount: v })} /><S label={bi('增益', 'Gain')} value={l.gain} min={.01} max={.6} step={.01} onChange={v => lp(i, 'gain', v)} /></div>)}</div>

      <div className="panel"><div className="panel-title"><span>{t('sound.masterDsp')}</span><small>{t('sound.fxChain')}</small></div><S label={bi('主增益', 'Master gain')} value={s.masterGain ?? 1} min={.05} max={1.5} step={.01} onChange={v => patch('masterGain', v)} /><label className="toggle"><input type="checkbox" checked={s.limiter !== false} onChange={e => patch('limiter', e.target.checked)} />{bi('主限制器', 'Master limiter')}</label><S label={bi('長度', 'Duration s')} value={s.duration} min={.1} max={4} step={.01} onChange={v => patch('duration', v)} /><S label={bi('濾波', 'Filter Hz')} value={s.filterFrequency} min={120} max={12000} step={10} onChange={v => patch('filterFrequency', v)} /><S label={bi('共振', 'Resonance')} value={s.filterQ} min={0} max={18} step={.1} onChange={v => patch('filterQ', v)} /><S label={bi('失真', 'Distortion')} value={s.distortion} min={0} max={40} step={1} onChange={v => patch('distortion', v)} /><S label={bi('延遲混合', 'Delay mix')} value={s.delay} min={0} max={.65} step={.01} onChange={v => patch('delay', v)} /><hr /><S label={bi('起音', 'Attack')} value={s.attack} min={.001} max={.8} step={.001} onChange={v => patch('attack', v)} /><S label={bi('衰減', 'Decay')} value={s.decay} min={.001} max={1} step={.001} onChange={v => patch('decay', v)} /><S label={bi('延音', 'Sustain')} value={s.sustain} min={.01} max={1} step={.01} onChange={v => patch('sustain', v)} /><S label={bi('釋放', 'Release')} value={s.release} min={.001} max={1.5} step={.001} onChange={v => patch('release', v)} /></div>

      <div className="panel code-panel"><div className="panel-title"><span>{t('sound.dsl')}</span><small>{t('sound.dslContract')}</small></div><textarea value={dsl} onChange={e => setDsl(e.target.value)} /><div className="dsl-actions"><button onClick={apply}><Upload size={14} />{t('sound.loadJson')}</button><button onClick={async () => { await navigator.clipboard.writeText(dsl); setStatus(t('sound.dslCopied')); }}><Copy size={14} />{t('common.copyJson')}</button></div></div></section></>}

    <footer><span>RESONA MVP v0.1.0</span><span>{t('footer.sound')}</span></footer>
  </main>;
}
