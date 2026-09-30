import { useEffect, useRef } from 'react';

type HeroMotionOptions = {
  mobileBreakpoint?: number;
  damping?: number;
};

const nearZero = (value: number) => Math.abs(value) < 0.002;

export function useHeroMotion({ mobileBreakpoint = 720, damping = 0.085 }: HeroMotionOptions = {}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const reduced = useRef(false);
  const visible = useRef(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const surface = stage.parentElement ?? stage;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = media.matches;

    const write = (x: number, y: number) => {
      const mobile = window.innerWidth <= mobileBreakpoint;
      const bgX = x * (mobile ? 1.1 : 2.0);
      const bgY = y * (mobile ? 0.7 : 1.1);
      const lightX = x * (mobile ? 0.8 : 1.8);
      const lightY = y * (mobile ? 0.5 : 1.1);
      const hudX = x * (mobile ? 2.0 : 5.0);
      const hudY = y * (mobile ? 1.2 : 3.0);
      const fgX = x * (mobile ? 2.6 : 6.0);
      const fgY = y * (mobile ? 1.5 : 4.0);

      stage.style.setProperty('--hero-x', x.toFixed(4));
      stage.style.setProperty('--hero-y', y.toFixed(4));
      stage.style.setProperty('--hero-bg-x', `${bgX.toFixed(2)}px`);
      stage.style.setProperty('--hero-bg-y', `${bgY.toFixed(2)}px`);
      stage.style.setProperty('--hero-light-x', `${lightX.toFixed(2)}px`);
      stage.style.setProperty('--hero-light-y', `${lightY.toFixed(2)}px`);
      stage.style.setProperty('--hero-hud-x', `${hudX.toFixed(2)}px`);
      stage.style.setProperty('--hero-hud-y', `${hudY.toFixed(2)}px`);
      stage.style.setProperty('--hero-fg-x', `${fgX.toFixed(2)}px`);
      stage.style.setProperty('--hero-fg-y', `${fgY.toFixed(2)}px`);
    };

    const stopFrame = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };

    const tick = () => {
      frame.current = null;
      if (!visible.current || reduced.current) return;

      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      current.current.x += dx * damping;
      current.current.y += dy * damping;
      write(current.current.x, current.current.y);

      if (!nearZero(dx) || !nearZero(dy)) frame.current = requestAnimationFrame(tick);
    };

    const ensureFrame = () => {
      if (frame.current === null && visible.current && !reduced.current) {
        frame.current = requestAnimationFrame(tick);
      }
    };

    const setTargetFromPointer = (event: PointerEvent) => {
      if (reduced.current) return;
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const touchScale = event.pointerType === 'touch' ? 0.5 : 1;
      target.current.x = Math.max(-1, Math.min(1, x)) * touchScale;
      target.current.y = Math.max(-1, Math.min(1, y)) * touchScale;
      ensureFrame();
    };

    const reset = () => {
      target.current.x = 0;
      target.current.y = 0;
      ensureFrame();
    };

    const onVisibility = () => {
      visible.current = !document.hidden;
      if (!visible.current) {
        stopFrame();
        return;
      }
      reset();
    };

    const onReducedMotion = (event: MediaQueryListEvent) => {
      reduced.current = event.matches;
      if (event.matches) {
        stopFrame();
        target.current = { x: 0, y: 0 };
        current.current = { x: 0, y: 0 };
        write(0, 0);
      } else {
        reset();
      }
    };

    surface.addEventListener('pointermove', setTargetFromPointer, { passive: true });
    surface.addEventListener('pointerleave', reset, { passive: true });
    surface.addEventListener('pointercancel', reset, { passive: true });
    surface.addEventListener('pointerup', reset, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener('change', onReducedMotion);
    write(0, 0);

    return () => {
      stopFrame();
      surface.removeEventListener('pointermove', setTargetFromPointer);
      surface.removeEventListener('pointerleave', reset);
      surface.removeEventListener('pointercancel', reset);
      surface.removeEventListener('pointerup', reset);
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener('change', onReducedMotion);
    };
  }, [damping, mobileBreakpoint]);

  return stageRef;
}
