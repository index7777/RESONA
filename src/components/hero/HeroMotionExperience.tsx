import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import './hero-experience.css';

const poster = `${import.meta.env.BASE_URL}brand/resona-hero-desktop-hq.webp`;
const source = `${import.meta.env.BASE_URL}brand/resona-hero-motion-v1.mp4`;
const key = 'resona-motion-v1-seen';
type Phase = 'loading' | 'intro' | 'transition' | 'idle';

// One-shot character performance; the original composition remains the idle frame.
export function HeroMotionExperience() {
  const { locale, t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [visible, setVisible] = useState(false);
  const [settling, setSettling] = useState(false);
  const timers = useRef<number[]>([]);
  const completed = useRef(false);
  const [enabled, setEnabled] = useState(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (new URLSearchParams(location.search).get('intro') === 'replay') return true;
    try { return sessionStorage.getItem(key) !== '1'; } catch { return true; }
  });
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    const element = video.current;
    element?.pause();
    if (element) element.dataset.playing = 'false';
    timers.current.forEach(clearTimeout);
    setSettling(true);
    timers.current = [window.setTimeout(() => {
      setVisible(false);
      setPhase('idle');
      timers.current.push(window.setTimeout(() => setSettling(false), 180));
    }, 180)];
    try { sessionStorage.setItem(key, '1'); } catch { /* optional storage */ }
  }, []);
  const fallback = useCallback(() => {
    setVisible(false);
    setEnabled(false);
    finish();
  }, [finish]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const element = video.current;
    if (!enabled || !element) { setPhase('idle'); return; }
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => { if (motion.matches) fallback(); };
    const hidden = () => {
      if (document.hidden) element.pause();
      else if (!element.ended && element.dataset.playing === 'true') void element.play().catch(fallback);
    };
    const timer = window.setTimeout(() => {
      if (element.readyState < 2 || (element.paused && element.dataset.playing !== 'true' && !element.ended)) fallback();
    }, 8000);
    motion.addEventListener('change', reduce);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener('change', reduce);
      document.removeEventListener('visibilitychange', hidden);
      element.pause();
    };
  }, [enabled, fallback]);

  useEffect(() => {
    if (video.current) video.current.dataset.playing = String(phase === 'intro' || phase === 'transition');
  }, [phase]);

  return <section className="brand-hero hero-experience hero-reference" data-phase={phase} data-video-visible={visible} data-settling={settling} aria-labelledby="brand-hero-title">
    <div className="hero-stage" aria-hidden="true">
      <img className="hero-stage__image" src={poster} width="2172" height="724" alt="" fetchPriority="high" />
      {enabled && <video ref={video} className="hero-reference__video" src={source} muted playsInline preload="auto" disablePictureInPicture
        onCanPlay={() => {
          if (phase === 'loading') void video.current?.play().catch(fallback);
        }}
        onPlaying={() => {
          setVisible(true);
          setPhase(previous => previous === 'loading' ? 'intro' : previous);
        }}
        onTimeUpdate={() => {
          const element = video.current;
          if (element && Number.isFinite(element.duration) && element.currentTime >= element.duration - 1.15) {
            setPhase(previous => previous === 'intro' ? 'transition' : previous);
          }
        }}
        onEnded={finish} onError={fallback} />}
    </div>
    <div className="brand-hero__scrim" />
    <div className="brand-hero__content" inert={phase === 'intro' || phase === 'transition'}>
      <p className="brand-hero__eyebrow">{t('hero.eyebrow')}</p>
      <h1 id="brand-hero-title">{locale === 'zh-TW' ? <><span className="hero-title-part">讓聲音，</span><wbr /><span className="hero-title-part">成為程式。</span></> : t('hero.title')}</h1>
      {locale === 'zh-TW' && <p className="brand-hero__english">{t('hero.titleAlt')}</p>}
      <p className="brand-hero__lede">{t('hero.lede')}</p>
      <div className="brand-hero__actions">
        <a className="brand-hero__primary" href="#workspace" onClick={finish}>{t('hero.open')} <ArrowDown size={16} /></a>
        <a className="brand-hero__secondary" href="https://github.com/index7777/RESONA" target="_blank" rel="noreferrer">{t('hero.github')}</a>
      </div>
    </div>
    <div className="brand-hero__rail" aria-hidden="true"><span>{t('hero.define')}</span><i /><span>{t('hero.render')}</span><i /><span>{t('hero.inspect')}</span><i /><span>{t('hero.ship')}</span></div>
    {(phase === 'intro' || phase === 'transition') && <button className="hero-skip" onClick={finish}>{locale === 'zh-TW' ? '跳過開場' : 'Skip intro'}</button>}
  </section>;
}
