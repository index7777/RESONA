import { useMemo, useRef, useState } from 'react';
import { Download, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { defaultSound, exportWav, playSound, SoundDefinition, Waveform } from './audio';

const waves: Waveform[] = ['sine', 'square', 'sawtooth', 'triangle'];

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="control">
      <span>
        {label}
        <strong>{value}{suffix ?? ''}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function App() {
  const [sound, setSound] = useState<SoundDefinition>(defaultSound);
  const [status, setStatus] = useState('Ready');
  const contextRef = useRef<AudioContext | null>(null);

  const definition = useMemo(() => JSON.stringify(sound, null, 2), [sound]);

  function patch<K extends keyof SoundDefinition>(key: K, value: SoundDefinition[K]) {
    setSound((current) => ({ ...current, [key]: value }));
  }

  async function handlePlay() {
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    if (context.state === 'suspended') await context.resume();
    playSound(context, sound);
    setStatus('Playing');
    window.setTimeout(() => setStatus('Ready'), sound.duration * 1000 + 100);
  }

  async function handleExport() {
    setStatus('Rendering WAV…');
    await exportWav(sound);
    setStatus('Exported');
    window.setTimeout(() => setStatus('Ready'), 1200);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <div>
            <h1>RESONA</h1>
            <p>Programmable Sound Studio</p>
          </div>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => setSound(defaultSound)}><RotateCcw size={16} /> Reset</button>
          <button className="ghost" onClick={handleExport}><Download size={16} /> Export WAV</button>
          <button className="primary" onClick={handlePlay}><Play size={16} fill="currentColor" /> Play</button>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Developer audio workbench</p>
          <h2>{sound.name}</h2>
          <p className="subtitle">Shape one-shot audio with deterministic browser DSP, then export it as a production-ready WAV.</p>
        </div>
        <div className="status"><Volume2 size={16} /> {status}</div>
      </section>

      <section className="grid">
        <div className="panel synth-panel">
          <div className="panel-title">
            <span>Generator</span>
            <small>Web Audio API</small>
          </div>

          <label className="text-control">
            <span>Name</span>
            <input value={sound.name} onChange={(event) => patch('name', event.target.value)} />
          </label>

          <div className="wave-selector">
            {waves.map((wave) => (
              <button
                key={wave}
                className={sound.waveform === wave ? 'active' : ''}
                onClick={() => patch('waveform', wave)}
              >
                {wave}
              </button>
            ))}
          </div>

          <Slider label="Frequency" value={sound.frequency} min={60} max={1600} step={1} suffix=" Hz" onChange={(v) => patch('frequency', v)} />
          <Slider label="Duration" value={sound.duration} min={0.1} max={3} step={0.01} suffix=" s" onChange={(v) => patch('duration', v)} />
          <Slider label="Gain" value={sound.gain} min={0.02} max={0.8} step={0.01} onChange={(v) => patch('gain', v)} />
          <Slider label="Filter" value={sound.filterFrequency} min={120} max={12000} step={10} suffix=" Hz" onChange={(v) => patch('filterFrequency', v)} />
          <Slider label="Resonance" value={sound.filterQ} min={0} max={18} step={0.1} onChange={(v) => patch('filterQ', v)} />
        </div>

        <div className="panel envelope-panel">
          <div className="panel-title">
            <span>Envelope</span>
            <small>ADSR</small>
          </div>
          <div className="visualizer" aria-hidden="true">
            <svg viewBox="0 0 600 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="stroke" x1="0" x2="1">
                  <stop offset="0%" stopColor="#67f3d4" />
                  <stop offset="55%" stopColor="#63b7ff" />
                  <stop offset="100%" stopColor="#d979ff" />
                </linearGradient>
              </defs>
              <path d="M 0 205 L 70 24 L 170 110 L 430 110 L 590 205" fill="none" stroke="url(#stroke)" strokeWidth="5" />
              <path d="M 0 205 L 70 24 L 170 110 L 430 110 L 590 205 L 0 205" fill="url(#stroke)" opacity="0.08" />
            </svg>
          </div>
          <Slider label="Attack" value={sound.attack} min={0.001} max={0.8} step={0.001} suffix=" s" onChange={(v) => patch('attack', v)} />
          <Slider label="Decay" value={sound.decay} min={0.001} max={1} step={0.001} suffix=" s" onChange={(v) => patch('decay', v)} />
          <Slider label="Sustain" value={sound.sustain} min={0.01} max={1} step={0.01} onChange={(v) => patch('sustain', v)} />
          <Slider label="Release" value={sound.release} min={0.001} max={1.5} step={0.001} suffix=" s" onChange={(v) => patch('release', v)} />
        </div>

        <div className="panel code-panel">
          <div className="panel-title">
            <span>Sound Definition</span>
            <small>Agent-friendly JSON</small>
          </div>
          <pre>{definition}</pre>
        </div>
      </section>

      <footer>
        <span>RESONA v0.1</span>
        <span>Local-first · deterministic DSP · no backend required</span>
      </footer>
    </main>
  );
}
