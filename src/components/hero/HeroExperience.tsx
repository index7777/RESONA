import { useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useHeroTimeline } from './useHeroTimeline';
import { IntroSequence } from './IntroSequence';
import './hero-experience.css';

const image = `${import.meta.env.BASE_URL}brand/resona-hero-desktop-hq.webp`;

export function HeroExperience() {
  const { locale, t } = useI18n();
  const root = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { phase, finish } = useHeroTimeline(root, ready);
  const opening = phase === 'intro' || phase === 'transition';
  return <section ref={root} className="brand-hero hero-experience" data-phase={phase} aria-labelledby="brand-hero-title">
    <div className="hero-stage" aria-hidden="true">
      <div className="hero-stage__camera" data-shot="camera">
        <img className="hero-stage__image" src={failed ? `${import.meta.env.BASE_URL}brand/resona-hero-fallback.svg` : image}
          width="2172" height="724" alt="" fetchPriority="high" decoding="async"
          onLoad={() => setReady(true)} onError={() => { setFailed(true); setReady(true); }} />
      </div>
      <div className="hero-atmosphere">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ left: `${12 + i * 11}%`, animationDelay: `${-i * 2.3}s` }} />)}</div>
      <div className="hero-lighting" />
    </div>
    <div className="brand-hero__scrim" />
    <div className="brand-hero__content" data-shot="copy">
      <p className="brand-hero__eyebrow">{t('hero.eyebrow')}</p>
      <h1 id="brand-hero-title">{locale === 'zh-TW' ? <><span className="hero-title-part">讓聲音，</span><wbr /><span className="hero-title-part">成為程式。</span></> : t('hero.title')}</h1>
      {locale === 'zh-TW' && <p className="brand-hero__english">{t('hero.titleAlt')}</p>}
      <p className="brand-hero__lede">{t('hero.lede')}</p>
      <div className="brand-hero__actions">
        <a className="brand-hero__primary" href="#workspace" onClick={finish}>{t('hero.open')} <ArrowDown size={16} /></a>
        <a className="brand-hero__secondary" href="https://github.com/index7777/RESONA" target="_blank" rel="noreferrer">{t('hero.github')}</a>
      </div>
    </div>
    <div className="brand-hero__rail" data-shot="rail" aria-hidden="true"><span>{t('hero.define')}</span><i /><span>{t('hero.render')}</span><i /><span>{t('hero.inspect')}</span><i /><span>{t('hero.ship')}</span></div>
    <IntroSequence image={image} />
    {opening && <button className="hero-skip" onClick={finish}>{locale === 'zh-TW' ? '跳過開場' : 'Skip intro'}</button>}
  </section>;
}
