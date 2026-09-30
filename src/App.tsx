import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Copy, Download, Music, Play, Square, RotateCcw } from 'lucide-react';
import { defaultSong, exportSong, playSong, renderSong } from './sequencer';
import type { Song, Wave } from './sequencer';
import { fmtDb, fmtPct, inspectBuffer } from './inspector';
import type { AudioMetrics } from './inspector';
import { fixSong } from './autofix';
import { downloadReport, iterationReport } from './report';
import type { IterationReport } from './report';
import { App as SoundLab } from './SoundLab';

const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ws: Wave[] = ['sine', 'square', 'sawtooth', 'triangle'];
const MUSIC_ANALYSIS_DEBOUNCE_MS = 180;
const LONG_PRESS_MS = 450;

type SelectedNote = { track: number; step: number } | null;

export function App() {
  const [mode, setMode] = useState<'sound' | 'music'>('sound');
  const [song, setSong] = useState<Song>(defaultSong);
  const [cursor, setCursor] = useState(-1);
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [report, setReport] = useState<IterationReport | null>(null);
  const [pending, setPending] = useState<{ before: AudioMetrics; fix: ReturnType<typeof fixSong>['report'] } | null>(null);
  const [selectedNote, setSelectedNote] = useState<SelectedNote>(null);

  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef(0);
  const playback = useRef<null | (() => void)>(null);
  const renderId = useRef(0);
  const pressTimer = useRef(0);
  const longPressTriggered = useRef(false);

  useEffect(() => () => {
    renderId.current++;
    playback.current?.();
    clearInterval(timer.current);
    clearTimeout(pressTimer.current);
    const c = ctx.current;
    if (c && c.state !== 'closed') void c.close();
  }, []);

  useEffect(() => {
    const id = ++renderId.current;
    const debounce = window.setTimeout(() => {
      renderSong(song).then(buffer => {
        if (id !== renderId.current) return;
        const next = inspectBuffer(buffer);
        setMetrics(next);
        if (pending) {
          setReport(iterationReport('music', song.seed, pending.before, next, pending.fix));
          setPending(null);
        }
      });
    }, MUSIC_ANALYSIS_DEBOUNCE_MS);
    return () => window.clearTimeout(debounce);
  }, [song]);

  function stop() {
    playback.current?.();
    playback.current = null;
    clearInterval(timer.current);
    setCursor(-1);
  }

  async function play() {
    stop();
    const c = ctx.current ?? new AudioContext();
    ctx.current = c;
    if (c.state === 'suspended') await c.resume();
    const handle = playSong(c, song);
    playback.current = handle.stop;
    clearInterval(timer.current);
    let i = 0;
    setCursor(0);
    timer.current = window.setInterval(() => {
      i++;
      if (i >= 16 * song.bars) {
        clearInterval(timer.current);
        setCursor(-1);
      } else {
        setCursor(i % 16);
      }
    }, 60 / song.bpm / 4 * 1000);
  }

  function autoFix() {
    if (!metrics) return;
    const r = fixSong(song, metrics);
    setPending({ before: metrics, fix: r.report });
    setSong(r.value);
  }

  const drumToggle = (ti: number, si: number) => setSong(current => ({
    ...current,
    drums: current.drums.map((track, i) => i === ti ? {
      ...track,
      steps: track.steps.map((value, j) => j === si ? !value : value),
    } : track),
  }));

  const toggle = (ti: number, si: number) => setSong(current => ({
    ...current,
    tracks: current.tracks.map((track, i) => i === ti ? {
      ...track,
      steps: track.steps.map((step, j) => j === si ? { ...step, on: !step.on } : step),
    } : track),
  }));

  const note = (ti: number, si: number, delta: number) => setSong(current => ({
    ...current,
    tracks: current.tracks.map((track, i) => i === ti ? {
      ...track,
      steps: track.steps.map((step, j) => j === si ? {
        ...step,
        note: Math.max(24, Math.min(96, step.note + delta)),
      } : step),
    } : track),
  }));

  function openPitchEditor(ti: number, si: number) {
    setSong(current => ({
      ...current,
      tracks: current.tracks.map((track, i) => i === ti ? {
        ...track,
        steps: track.steps.map((step, j) => j === si ? { ...step, on: true } : step),
      } : track),
    }));
    setSelectedNote({ track: ti, step: si });
  }

  function beginStepPress(ti: number, si: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    clearTimeout(pressTimer.current);
    longPressTriggered.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      openPitchEditor(ti, si);
    }, LONG_PRESS_MS);
  }

  function endStepPress(ti: number, si: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    clearTimeout(pressTimer.current);
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    toggle(ti, si);
  }

  function cancelStepPress() {
    clearTimeout(pressTimer.current);
    longPressTriggered.current = false;
  }

  useEffect(() => {
    stop();
    setSelectedNote(null);
  }, [mode]);

  if (mode === 'sound') {
    return <>
      <nav className="modebar">
        <button className="active">Sound Lab</button>
        <button onClick={() => setMode('music')}><Music size={14} />Music Lab</button>
      </nav>
      <SoundLab />
    </>;
  }

  const selected = selectedNote ? song.tracks[selectedNote.track]?.steps[selectedNote.step] : null;
  const selectedTrack = selectedNote ? song.tracks[selectedNote.track] : null;

  return <main className="shell">
    <nav className="modebar">
      <button onClick={() => setMode('sound')}>Sound Lab</button>
      <button className="active"><Music size={14} />Music Lab</button>
    </nav>

    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Music size={17} /></div><div><h1>RESONA</h1><p>BGM Composer</p></div></div>
      <div className="actions">
        <button onClick={() => setSong(defaultSong)}><RotateCcw size={15} />Reset</button>
        <button onClick={() => exportSong(song)}><Download size={15} />Export BGM</button>
        <button onClick={stop}><Square size={15} />Stop</button>
        <button className="primary" onClick={play}><Play size={15} />Play</button>
      </div>
    </header>

    <section className="hero-panel">
      <div><p className="eyebrow">Procedural game music</p><h2>{song.name}</h2><p className="subtitle">Multi-bar synth loops with key transpose, editable pitches, playback cursor and offline WAV rendering.</p></div>
      <div className="transport">
        <label>BPM<input type="number" min="50" max="220" value={song.bpm} onChange={e => setSong({ ...song, bpm: +e.target.value })} /></label>
        <label>Bars<select value={song.bars} onChange={e => setSong({ ...song, bars: +e.target.value })}><option>1</option><option>2</option><option>4</option><option>8</option></select></label>
        <label>Seed<input type="number" value={song.seed} onChange={e => setSong({ ...song, seed: +e.target.value || 0 })} /></label>
        <label>Key<select value={song.key} onChange={e => setSong({ ...song, key: +e.target.value })}>{keys.map((k, i) => <option key={k} value={i}>{k}</option>)}</select></label>
      </div>
    </section>

    <section className="inspector panel">
      <div className="panel-title"><span>Mix Inspector <button className="mini fix" disabled={!metrics || metrics.status === 'clean'} onClick={autoFix}>Auto-Fix Mix</button></span><small className={metrics?.status}>{metrics?.status ?? 'rendering'}</small></div>
      <div className="metric-grid"><div><small>Peak</small><strong>{metrics ? fmtDb(metrics.peakDb) : '—'}</strong></div><div><small>RMS</small><strong>{metrics ? fmtDb(metrics.rmsDb) : '—'}</strong></div><div><small>Crest</small><strong>{metrics ? metrics.crestDb.toFixed(1) + ' dB' : '—'}</strong></div><div><small>DC</small><strong>{metrics ? metrics.dc.toFixed(4) : '—'}</strong></div><div><small>Clipped</small><strong>{metrics?.clipped ?? '—'}</strong></div></div>
      <div className="spectral-grid"><div><small>Centroid</small><strong>{metrics ? Math.round(metrics.centroidHz) + ' Hz' : '—'}</strong></div><div><small>Sub &lt;120 Hz</small><strong>{metrics ? fmtPct(metrics.lowRatio) : '—'}</strong></div><div><small>Air &gt;10 kHz</small><strong>{metrics ? fmtPct(metrics.highRatio) : '—'}</strong></div></div>
      {metrics?.issues.length ? <div className="issues">{metrics.issues.map(x => <span key={x}>{x}</span>)}</div> : null}
    </section>

    {report && <section className="iteration panel"><div className="panel-title"><span>Agent Iteration Report</span><button className="mini" onClick={() => downloadReport(report, song.name)}>JSON Report</button></div><div className="iteration-row"><strong>{report.verified ? 'VERIFIED' : 'REVIEW'}</strong><span>Peak {report.before.peakDb.toFixed(1)} → {report.after.peakDb.toFixed(1)} dB</span><span>Clipped {report.before.clipped} → {report.after.clipped}</span><span>Gain × {report.fix.gainScale.toFixed(3)}</span></div></section>}

    <section className="panel sequencer">
      <div className="beat-head"><span>TRACK</span>{Array.from({ length: 16 }, (_, i) => <b key={i} className={cursor === i ? 'cursor' : ''}>{i + 1}</b>)}</div>
      {song.tracks.map((track, ti) => <div className="track" key={track.name}>
        <div className="track-name"><strong>{track.name}</strong><small>{track.wave}</small></div>
        {track.steps.map((step, si) => <button
          key={si}
          className={'step ' + (step.on ? 'on ' : '') + (cursor === si ? 'cursor' : '')}
          onPointerDown={e => beginStepPress(ti, si, e)}
          onPointerUp={e => endStepPress(ti, si, e)}
          onPointerCancel={cancelStepPress}
          onPointerLeave={cancelStepPress}
          onContextMenu={e => {
            e.preventDefault();
            if (window.matchMedia('(pointer: fine)').matches) note(ti, si, e.shiftKey ? -1 : 1);
          }}
          title="Tap: toggle · Long press: edit pitch · Right click: pitch +1 · Shift+right click: -1"
        >{step.on ? step.note : ''}</button>)}
      </div>)}
    </section>

    {selectedNote && selected && selectedTrack && <section className="mobile-note-editor" aria-label="Pitch editor">
      <div className="mobile-note-editor__meta"><strong>{selectedTrack.name} · Step {selectedNote.step + 1}</strong><small>Long-press any melodic step to edit pitch</small></div>
      <div className="mobile-note-editor__controls">
        <button aria-label="Pitch down" onClick={() => note(selectedNote.track, selectedNote.step, -1)}>−</button>
        <strong>{selected.note}</strong>
        <button aria-label="Pitch up" onClick={() => note(selectedNote.track, selectedNote.step, 1)}>+</button>
        <button className="mobile-note-editor__done" onClick={() => setSelectedNote(null)}>Done</button>
      </div>
    </section>}

    <section className="panel sequencer drums"><div className="panel-title"><span>Drum Engine</span><small>sample-free synthesis</small></div>{song.drums.map((track, ti) => <div className="track" key={track.name}><div className="track-name"><strong>{track.name}</strong><small>{track.kind}</small></div>{track.steps.map((on, si) => <button key={si} className={'step drum ' + (on ? 'on ' : '') + (cursor === si ? 'cursor' : '')} onClick={() => drumToggle(ti, si)}>{on ? '●' : ''}</button>)}</div>)}</section>

    <section className="music-dsl panel"><div className="panel-title"><span>Music DSL v1</span><button onClick={() => navigator.clipboard.writeText(JSON.stringify(song, null, 2))}><Copy size={14} />Copy JSON</button></div><pre>{JSON.stringify(song, null, 2)}</pre></section>

    <section className="music-controls">{song.tracks.map((track, ti) => <div className="panel" key={track.name}><div className="panel-title"><span>{track.name}</span><small>MIDI notes</small></div><label className="control"><span>Gain<strong>{track.gain}</strong></span><input type="range" min=".01" max=".25" step=".005" value={track.gain} onChange={e => setSong(current => ({ ...current, tracks: current.tracks.map((x, i) => i === ti ? { ...x, gain: +e.target.value } : x) }))} /></label><div className="wave-selector">{ws.map(w => <button key={w} className={track.wave === w ? 'active' : ''} onClick={() => setSong(current => ({ ...current, tracks: current.tracks.map((x, i) => i === ti ? { ...x, wave: w } : x) }))}>{w}</button>)}</div></div>)}</section>

    <footer><span>RESONA v2.8 · BGM Composer</span><span>Generation-safe render · touch pitch editing · Music DSL · WAV</span></footer>
  </main>;
}
