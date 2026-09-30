import type { HeroSignalDetail } from './heroSignal';

export function HeroSignalOverlay({ signal }: { signal: HeroSignalDetail }) {
  return (
    <div className="brand-hero__signal-stack" aria-hidden="true" data-state={signal.state}>
      <svg className="brand-hero__hud brand-hero__hud--back" viewBox="0 0 1600 620" preserveAspectRatio="none">
        <g className="brand-hero__hud-grid">
          {Array.from({ length: 9 }, (_, i) => <line key={`v-${i}`} x1={80 + i * 180} y1="120" x2={80 + i * 180} y2="520" />)}
          {Array.from({ length: 4 }, (_, i) => <line key={`h-${i}`} x1="80" y1={180 + i * 90} x2="1520" y2={180 + i * 90} />)}
        </g>
        <path className="brand-hero__hud-route" d="M120 420 C340 350 420 470 620 370 S980 300 1140 390 S1360 440 1510 320" />
        <g className="brand-hero__hud-ticks">
          {Array.from({ length: 23 }, (_, i) => <line key={i} x1={120 + i * 58} y1="421" x2={120 + i * 58} y2={i % 4 === 0 ? 437 : 430} />)}
        </g>
      </svg>

      <svg className="brand-hero__hud brand-hero__hud--front" viewBox="0 0 1600 620" preserveAspectRatio="none">
        <path className="brand-hero__wave brand-hero__wave--mint" d="M60 354 L110 354 L130 343 L150 370 L174 314 L196 391 L222 333 L246 359 L270 352 L306 352 L326 341 L350 365 L378 325 L404 374 L430 346 L456 354 L510 354 L536 335 L562 367 L590 320 L620 382 L650 345 L680 354 L736 354 L760 342 L786 365 L812 330 L840 374 L868 348 L900 354 L950 354 L976 338 L1002 369 L1030 326 L1058 378 L1088 346 L1118 354 L1170 354 L1194 342 L1220 363 L1246 333 L1274 370 L1302 349 L1330 354 L1380 354 L1408 344 L1438 361 L1470 342 L1502 354 L1540 354" />
        <path className="brand-hero__wave brand-hero__wave--phase" d="M60 376 C180 360 250 392 360 372 S560 348 690 378 S930 396 1080 368 S1310 352 1540 380" />
        <g className="brand-hero__signal-nodes">
          <circle cx="382" cy="326" r="3" />
          <circle cx="836" cy="375" r="2.5" />
          <circle cx="1248" cy="333" r="3" />
        </g>
        <g className="brand-hero__data-fragments">
          <text x="1110" y="235">FFT 48K</text>
          <text x="1180" y="260">SEED 0777</text>
          <text x="1260" y="286">NODE / DSP</text>
        </g>
      </svg>

      <div className="brand-hero__scan" />
      <div className="brand-hero__state-pulse" />
    </div>
  );
}
