import { useEffect, useRef } from "react";
import "./hero.css";

const heroImage = `${import.meta.env.BASE_URL}brand/resona-hero-original.png`;

export function BrandHero() {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = hero.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        node.style.setProperty(
          "--px",
          ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3),
        );
        node.style.setProperty(
          "--py",
          ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3),
        );
      });
    };
    const reset = () => {
      node.style.setProperty("--px", "0");
      node.style.setProperty("--py", "0");
    };
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <section
      ref={hero}
      className="cinematic-hero"
      aria-label="RESONA character and future city"
    >
      <img
        className="cinematic-hero__base"
        src={heroImage}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <div className="cinematic-hero__layer cinematic-hero__left">
        <img src={heroImage} alt="" />
      </div>
      <div className="cinematic-hero__layer cinematic-hero__right">
        <img src={heroImage} alt="" />
      </div>
      <div
        className="cinematic-hero__wave cinematic-hero__wave--mint"
        aria-hidden="true"
      />
      <div
        className="cinematic-hero__wave cinematic-hero__wave--violet"
        aria-hidden="true"
      />
      <div className="cinematic-hero__scan" aria-hidden="true" />
      <div className="cinematic-hero__shade" aria-hidden="true" />
    </section>
  );
}
