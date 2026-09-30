import { ArrowDown } from 'lucide-react';
import { HeroMotionStage } from './HeroMotionStage';
import { useHeroSignalState } from './heroSignal';

function GithubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.1 15 2a13.4 13.4 0 0 0-6 0C5.8.1 4.7.5 4.7.5A5 5 0 0 0 4.6 4a5.4 5.4 0 0 0-1.4 3.5c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 9 18v4" />
      <path d="M9 19c-3 .9-3-1.5-4-2" />
    </svg>
  );
}

export function BrandHero() {
  const signal = useHeroSignalState();

  return (
    <section className="brand-hero" aria-labelledby="brand-hero-title" data-hero-state={signal.state}>
      <HeroMotionStage signal={signal} />
      <div className="brand-hero__scrim" />
      <div className="brand-hero__content">
        <p className="brand-hero__eyebrow">PROGRAMMABLE AUDIO</p>
        <h1 id="brand-hero-title">Sound, as code.</h1>
        <p className="brand-hero__lede">Build, inspect, iterate and export audio from structured definitions.</p>
        <div className="brand-hero__actions">
          <a className="brand-hero__primary" href="#workspace">Open Workbench <ArrowDown size={16} /></a>
          <a className="brand-hero__secondary" href="https://github.com/index7777/RESONA" target="_blank" rel="noreferrer">View GitHub <GithubIcon /></a>
        </div>
      </div>
      <div className="brand-hero__rail" aria-hidden="true"><span>DEFINE</span><i /><span>RENDER</span><i /><span>INSPECT</span><i /><span>SHIP</span></div>
    </section>
  );
}
