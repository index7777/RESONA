import { useEffect, useState } from 'react';

export type HeroSignalState =
  | 'idle'
  | 'playing'
  | 'rendering'
  | 'inspecting'
  | 'optimizing'
  | 'verified'
  | 'warning'
  | 'error';

export type HeroSignalMetrics = {
  energy?: number;
  highRatio?: number;
  lowRatio?: number;
};

export type HeroSignalDetail = HeroSignalMetrics & {
  state: HeroSignalState;
};

const EVENT_NAME = 'resona:hero-signal';

const clamp01 = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : undefined;

export function emitHeroSignal(detail: HeroSignalDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<HeroSignalDetail>(EVENT_NAME, {
    detail: {
      ...detail,
      energy: clamp01(detail.energy),
      highRatio: clamp01(detail.highRatio),
      lowRatio: clamp01(detail.lowRatio),
    },
  }));
}

export function useHeroSignalState() {
  const [detail, setDetail] = useState<HeroSignalDetail>({ state: 'idle' });

  useEffect(() => {
    const onSignal = (event: Event) => {
      const next = (event as CustomEvent<HeroSignalDetail>).detail;
      if (!next?.state) return;
      setDetail({
        ...next,
        energy: clamp01(next.energy),
        highRatio: clamp01(next.highRatio),
        lowRatio: clamp01(next.lowRatio),
      });
    };

    window.addEventListener(EVENT_NAME, onSignal);
    return () => window.removeEventListener(EVENT_NAME, onSignal);
  }, []);

  return detail;
}
