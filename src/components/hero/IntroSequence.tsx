export function IntroSequence({ image }: { image: string }) {
  const art = { backgroundImage: `url("${image}")` };
  return <div className="hero-intro" aria-hidden="true">
    <div className="intro-black" data-shot="black" />
    <div className="intro-panel intro-panel--eye" data-shot="eye" style={art} />
    <div className="intro-panel intro-panel--side" data-shot="side" style={art} />
    <div className="intro-sweep" data-shot="sweep" />
    <div className="intro-hit" data-shot="hit" />
    <div className="intro-wordmark" data-shot="wordmark"><span>RESONA</span></div>
    <div className="intro-montage" data-shot="montage">
      <div className="intro-fragment intro-fragment--eye" style={art} />
      <div className="intro-fragment intro-fragment--signal" style={art} />
      <div className="intro-fragment intro-fragment--side" style={art} />
    </div>
    <span data-shot="clock" />
    <span data-shot="transition" />
  </div>;
}
