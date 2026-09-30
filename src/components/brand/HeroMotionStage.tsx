import { useState, type CSSProperties } from 'react';
import type { HeroSignalDetail } from './heroSignal';
import { HeroSignalOverlay } from './HeroSignalOverlay';
import { useHeroMotion } from './useHeroMotion';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const HERO_DESKTOP = asset('brand/resona-hero-desktop-hq.webp');
const HERO_MOBILE = HERO_DESKTOP;
const HERO_FALLBACK = asset('brand/resona-hero-fallback.svg');

export function HeroMotionStage({ signal }: { signal: HeroSignalDetail }) {
  const [failed, setFailed] = useState(false);
  const stageRef = useHeroMotion();

  return (
    <div
      ref={stageRef}
      className="brand-hero__stage"
      data-state={signal.state}
      style={{
        '--hero-energy': signal.energy ?? 0,
        '--hero-high-ratio': signal.highRatio ?? 0,
        '--hero-low-ratio': signal.lowRatio ?? 0,
      } as CSSProperties}
      aria-hidden="true"
    >
      <picture className="brand-hero__art-base">
        {!failed && <source media="(max-width: 720px)" srcSet={HERO_MOBILE} type="image/webp" />}
        <img src={failed ? HERO_FALLBACK : HERO_DESKTOP} alt="" decoding="async" fetchPriority="high" onError={() => setFailed(true)} />
      </picture>
      <div className="brand-hero__depth-light" />
      <HeroSignalOverlay signal={signal} />
      <div className="brand-hero__foreground-fx" />
    </div>
  );
}
