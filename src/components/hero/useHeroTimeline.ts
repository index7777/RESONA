import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type HeroPhase = 'loading' | 'intro' | 'transition' | 'idle';
const duration = 5300;
const storageKey = 'resona-intro-played';

function shouldPlay() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (new URLSearchParams(location.search).get('intro') === 'replay') return true;
  try { return sessionStorage.getItem(storageKey) !== '1'; } catch { return true; }
}

export function useHeroTimeline(root: RefObject<HTMLElement | null>, ready: boolean) {
  const [phase, setPhase] = useState<HeroPhase>('loading');
  const animations = useRef<Animation[]>([]);
  const finished = useRef(false);
  const finish = useCallback(() => {
    finished.current = true;
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    setPhase('idle');
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* optional storage */ }
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node || !ready || finished.current) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!shouldPlay()) { setPhase('idle'); return; }
    setPhase('intro');
    const start = document.timeline.currentTime;
    const animate = (name: string, frames: Keyframe[], options: KeyframeAnimationOptions = {}) => {
      const element = node.querySelector<HTMLElement>(`[data-shot="${name}"]`);
      if (!element) return null;
      const animation = element.animate(frames, { duration, fill: 'both', ...options });
      animation.startTime = start;
      animations.current.push(animation);
      return animation;
    };
    // All shots share one clock. The final camera is the actual Hero composition.
    animate('camera', [
      { transform: 'scale(1.12) translate(1%, 0)', offset: 0 },
      { transform: 'scale(1.16) translate(1%, 0)', offset: .17 },
      { transform: 'scale(1.09) translate(-1%, 0)', offset: .32 },
      { transform: 'scale(1.025) translate(0, 0)', offset: .405 },
      { transform: 'scale(1.025) translate(0, 0)', offset: .68 },
      { transform: 'scale(1) translate(0, 0)', offset: .895 },
      { transform: 'scale(1) translate(0, 0)', offset: 1 },
    ]);
    animate('black', [
      { opacity: 1, offset: 0 }, { opacity: 1, offset: .066 },
      { opacity: .64, offset: .169 }, { opacity: .9, offset: .17 },
      { opacity: .9, offset: .32 }, { opacity: .15, offset: .345 },
      { opacity: .24, offset: .46 }, { opacity: .24, offset: .68 },
      { opacity: 0, offset: .79 }, { opacity: 0, offset: 1 },
    ]);
    animate('eye', [{ opacity: 1, transform: 'translateX(-3%) scale(1.035)' }, { opacity: 1, transform: 'translateX(0) scale(1)' }], { delay: 900, duration: 450, fill: 'none' });
    animate('side', [{ opacity: 0, transform: 'translateX(8%)' }, { opacity: 1, transform: 'translateX(0)', offset: .22 }, { opacity: 1, offset: .86 }, { opacity: 0 }], { delay: 1350, duration: 350 });
    animate('sweep', [{ transform: 'translateX(-110%)', opacity: 0 }, { opacity: .8, offset: .25 }, { transform: 'translateX(110%)', opacity: 0 }], { delay: 1570, duration: 260 });
    animate('hit', [{ opacity: 0 }, { opacity: .65, offset: .35 }, { opacity: 0 }], { delay: 2150, duration: 100 });
    animate('wordmark', [{ opacity: 0, transform: 'translateY(18px)', clipPath: 'inset(100% 0 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0)', offset: .32 }, { opacity: 1, offset: .82 }, { opacity: 0, transform: 'translateY(-8px)' }], { delay: 2450, duration: 650 });
    animate('montage', [{ opacity: 0, transform: 'scale(1.045)' }, { opacity: 1, transform: 'scale(1)', offset: .15 }, { opacity: 1, offset: .54 }, { opacity: 0, transform: 'scale(.97)' }], { delay: 3100, duration: 800 });
    for (const name of ['copy', 'rail']) animate(name, [{ opacity: 0 }, { opacity: 0, offset: .735 }, { opacity: 1, offset: .895 }, { opacity: 1 }]);
    const marker = animate('transition', [{ opacity: 0 }, { opacity: 0 }], { delay: 3650, duration: 550 });
    if (marker) marker.onfinish = () => setPhase('transition');
    const clock = animate('clock', [{ opacity: 0 }, { opacity: 0 }]);
    if (clock) clock.onfinish = finish;
    const reduce = () => { if (motion.matches) finish(); };
    motion.addEventListener('change', reduce);
    return () => { animations.current.forEach(animation => animation.cancel()); animations.current = []; motion.removeEventListener('change', reduce); };
  }, [ready, root, finish]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const pointer = matchMedia('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (!pointer.matches || node.dataset.phase !== 'idle') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
        const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
        node.style.setProperty('--hero-x', `${x * 10}px`);
        node.style.setProperty('--hero-y', `${y * 6}px`);
      });
    };
    const reset = () => { node.style.setProperty('--hero-x', '0px'); node.style.setProperty('--hero-y', '0px'); };
    node.addEventListener('pointermove', move, { passive: true });
    node.addEventListener('pointerleave', reset);
    return () => { cancelAnimationFrame(frame); node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', reset); };
  }, [root]);
  return { phase, finish };
}
