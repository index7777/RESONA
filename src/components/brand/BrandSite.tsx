import { useEffect, useState, type ReactNode } from 'react';
import { BrandHero } from './BrandHero';

const INTRO_KEY = 'resona:intro-seen';

function GithubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.1 15 2a13.4 13.4 0 0 0-6 0C5.8.1 4.7.5 4.7.5A5 5 0 0 0 4.6 4a5.4 5.4 0 0 0-1.4 3.5c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 9 18v4" />
      <path d="M9 19c-3 .9-3-1.5-4-2" />
    </svg>
  );
}

function ResonanceMark({ compact = false }: { compact?: boolean }) {
  return (
    <svg className={compact ? 'resonance-mark resonance-mark--compact' : 'resonance-mark'} viewBox="0 0 64 64" aria-hidden="true">
      <circle className="resonance-mark__ring resonance-mark__ring--a" cx="32" cy="32" r="23" />
      <circle className="resonance-mark__ring resonance-mark__ring--b" cx="32" cy="32" r="23" />
      <path className="resonance-mark__wave" d="M8 32h10l3-9 5 19 5-28 5 36 5-24 4 13 3-7h8" />
      <circle className="resonance-mark__core" cx="32" cy="32" r="3.25" />
    </svg>
  );
}

function shouldShowIntro() {
  try { return !window.sessionStorage.getItem(INTRO_KEY); } catch { return false; }
}

function IntroGate() {
  const [visible, setVisible] = useState(shouldShowIntro);
  useEffect(() => {
    if (!visible) return;
    try { window.sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* optional storage */ }
    const timer = window.setTimeout(() => setVisible(false), 1650);
    return () => window.clearTimeout(timer);
  }, [visible]);
  if (!visible) return null;
  return <div className="brand-intro" aria-hidden="true"><div className="brand-intro__lockup"><ResonanceMark /><div className="brand-intro__wordmark">RESONA</div></div></div>;
}

function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-header__brand" href="#top" aria-label="RESONA home"><ResonanceMark compact /><span>RESONA</span></a>
      <nav className="site-header__nav" aria-label="Primary">
        <a href="#workspace">Workbench</a>
        <a href="https://github.com/index7777/RESONA" target="_blank" rel="noreferrer"><GithubIcon /> GitHub</a>
      </nav>
    </header>
  );
}

export function BrandSite({ children }: { children: ReactNode }) {
  return <div id="top" className="brand-site"><IntroGate /><SiteHeader /><BrandHero /><section id="workspace" className="brand-workspace" aria-label="RESONA workbench">{children}</section></div>;
}
