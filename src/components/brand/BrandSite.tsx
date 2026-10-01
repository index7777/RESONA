import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { useI18n } from '../../i18n';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const HERO_DESKTOP = asset('brand/resona-hero-desktop-hq.webp');
const HERO_MOBILE = HERO_DESKTOP;
const CHARACTER_MASTER = asset('brand/resona-hero-desktop.png');
const HERO_FALLBACK = asset('brand/resona-hero-fallback.svg');
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
  const { locale, setLocale, t } = useI18n();
  return (
    <header className="site-header">
      <a className="site-header__brand" href="#top" aria-label="RESONA home"><ResonanceMark compact /><span>RESONA</span></a>
      <nav className="site-header__nav" aria-label="Primary">
        <a href="#workspace">{t('nav.workbench')}</a>
        <a href="#character">{t('nav.character')}</a>
        <a href="https://github.com/index7777/RESONA" target="_blank" rel="noreferrer"><GithubIcon /> {t('nav.github')}</a>
        <div className="locale-switch" role="group" aria-label={t('locale.label')}>
          <button className={locale === 'zh-TW' ? 'active' : ''} onClick={() => setLocale('zh-TW')} aria-pressed={locale === 'zh-TW'}>{t('locale.zh')}</button>
          <span aria-hidden="true">/</span>
          <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')} aria-pressed={locale === 'en'}>{t('locale.en')}</button>
        </div>
      </nav>
    </header>
  );
}

function HeroArtwork() {
  const [failed, setFailed] = useState(false);
  return (
    <picture className="brand-hero__art" aria-hidden="true">
      {!failed && <source media="(max-width: 720px)" srcSet={HERO_MOBILE} type="image/webp" />}
      <img src={failed ? HERO_FALLBACK : HERO_DESKTOP} alt="" decoding="async" fetchPriority="high" onError={() => setFailed(true)} />
    </picture>
  );
}

function BrandHero() {
  const { locale, t } = useI18n();
  return (
    <section className="brand-hero" aria-labelledby="brand-hero-title">
      <HeroArtwork />
      <div className="brand-hero__scrim" />
      <div className="brand-hero__signals" aria-hidden="true"><span /><span /><span /></div>
      <div className="brand-hero__content">
        <p className="brand-hero__eyebrow">{t('hero.eyebrow')}</p>
        <h1 id="brand-hero-title">{t('hero.title')}</h1>
        {locale === 'zh-TW' && <p className="brand-hero__english">{t('hero.titleAlt')}</p>}
        <p className="brand-hero__lede">{t('hero.lede')}</p>
        <div className="brand-hero__actions">
          <a className="brand-hero__primary" href="#workspace">{t('hero.open')} <ArrowDown size={16} /></a>
          <a className="brand-hero__secondary" href="https://github.com/index7777/RESONA" target="_blank" rel="noreferrer">{t('hero.github')} <GithubIcon /></a>
        </div>
      </div>
      <div className="brand-hero__rail" aria-hidden="true"><span>{t('hero.define')}</span><i /><span>{t('hero.render')}</span><i /><span>{t('hero.inspect')}</span><i /><span>{t('hero.ship')}</span></div>
    </section>
  );
}

function CharacterSection() {
  const { t } = useI18n();
  return (
    <section id="character" className="character-section" aria-labelledby="character-title">
      <div className="character-section__inner">
        <div className="character-section__visual">
          <div className="character-section__signal" aria-hidden="true" />
          <img src={CHARACTER_MASTER} alt="RESONA character master" loading="lazy" decoding="async" />
        </div>
        <div className="character-section__copy">
          <p className="character-section__eyebrow">{t('character.eyebrow')}</p>
          <h2 id="character-title">{t('character.title')}</h2>
          <p className="character-section__lede">{t('character.lede')}</p>
          <blockquote>{t('character.quote')}</blockquote>
          <div className="character-modules">
            <article><span>01</span><h3>{t('character.identityTitle')}</h3><p>{t('character.identityBody')}</p></article>
            <article><span>02</span><h3>{t('character.nodeTitle')}</h3><p>{t('character.nodeBody')}</p></article>
            <article><span>03</span><h3>{t('character.coreTitle')}</h3><p>{t('character.coreBody')}</p></article>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandSite({ children }: { children: ReactNode }) {
  return <div id="top" className="brand-site"><IntroGate /><SiteHeader /><BrandHero /><section id="workspace" className="brand-workspace" aria-label="RESONA workbench">{children}</section><CharacterSection /></div>;
}
