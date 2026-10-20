import { useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n";

type Kind = "sfx" | "bgm";
type AudioResult = { variant: number; contentType: string; durationSeconds: number | null; audioBase64: string; localUrl: string };
type Quote = { quoteId: string; credits: number; expiresAt: number };

const api = "/audio/api";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message || body.code || "REQUEST_FAILED"), { code: body.code, status: response.status });
  return body as T;
}

export function AiAudioStudio() {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>("bgm");
  const [prompt, setPrompt] = useState("史詩奇幻遊戲 Boss 戰配樂，熱血管弦樂、緊湊打擊與厚實銅管，純器樂，適合戰鬥場景");
  const [duration, setDuration] = useState(20);
  const [variants, setVariants] = useState(2);
  const [credits, setCredits] = useState<number | null>(null);
  const [account, setAccount] = useState<"loading" | "ready" | "signed-out" | "unavailable">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [results, setResults] = useState<AudioResult[]>([]);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => () => objectUrls.current.forEach(URL.revokeObjectURL), []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch(`${api}/me`, { credentials: "same-origin", cache: "no-store", signal: controller.signal }),
      fetch(`${api}/credits`, { credentials: "same-origin", cache: "no-store", signal: controller.signal }),
    ]).then(async ([meResponse, creditsResponse]) => {
      if (meResponse.status === 401 || creditsResponse.status === 401) { setAccount("signed-out"); return; }
      if (!meResponse.ok || !creditsResponse.ok) { setAccount("unavailable"); return; }
      const balance = await readJson<{ balance: number }>(creditsResponse);
      setCredits(balance.balance);
      setAccount("ready");
    }).catch(error => { if (error.name !== "AbortError") setAccount("unavailable"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDuration(kind === "sfx" ? 5 : 20);
    setPrompt(kind === "sfx"
      ? "遠處厚重的雷聲在雨夜中滾動，真實自然、低頻有重量，尾音逐漸消散"
      : "史詩奇幻遊戲 Boss 戰配樂，熱血管弦樂、緊湊打擊與厚實銅管，純器樂，適合戰鬥場景");
    setQuote(null);
    objectUrls.current.forEach(URL.revokeObjectURL);
    objectUrls.current = [];
    setResults([]);
  }, [kind]);

  async function createAudio() {
    objectUrls.current.forEach(URL.revokeObjectURL);
    objectUrls.current = [];
    setBusy(true); setMessage(""); setQuote(null); setResults([]);
    try {
      const payload = { kind, prompt: prompt.trim(), durationSeconds: duration, variants };
      const quoteResult = await readJson<Quote>(await fetch(`${api}/quote`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      }));
      setQuote(quoteResult);
      const result = await readJson<{ status: string; results?: Omit<AudioResult, "localUrl">[]; jobId?: string }>(await fetch(`${api}/generations`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ ...payload, quoteId: quoteResult.quoteId }),
      }));
      const localResults = (result.results || []).map(item => {
        const binary = atob(item.audioBase64);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        const localUrl = URL.createObjectURL(new Blob([bytes], { type: item.contentType }));
        objectUrls.current.push(localUrl);
        return { ...item, audioBase64: "", localUrl };
      });
      setResults(localResults);
      setMessage(result.status === "succeeded"
        ? t("ai.complete")
        : t("ai.pending") + (result.jobId ? ` (${result.jobId})` : ""));
      if (result.status === "succeeded") setCredits(value => value === null ? null : Math.max(0, value - quoteResult.credits));
    } catch (error) {
      const code = (error as { code?: string }).code || "";
      setMessage(code === "LOGIN_REQUIRED" ? t("ai.signIn")
        : code === "GENERATION_NOT_CONFIGURED" || code === "PRICING_NOT_CONFIGURED"
          ? t("ai.disabled")
          : code === "RESULT_NOT_RETAINED" ? t("ai.resultNotRetained")
          : code === "CREDITS_INSUFFICIENT" ? t("ai.insufficient")
            : t("ai.failed"));
    } finally { setBusy(false); }
  }

  const bounds = kind === "sfx" ? { min: 1, max: 30, step: 0.5 } : { min: 3, max: 380, step: 1 };
  return (
    <section className="ai-audio-studio" aria-labelledby="ai-audio-title">
      <div className="ai-audio-heading">
        <div><p className="eyebrow">{t("ai.eyebrow")}</p><h2 id="ai-audio-title">{t("ai.title")}</h2></div>
        <div className="ai-audio-balance">{t("ai.credits")} <strong>{credits === null ? "—" : credits}</strong></div>
      </div>
      <div className="ai-audio-tabs" role="tablist" aria-label={t("ai.type")}>
        <button type="button" role="tab" aria-selected={kind === "sfx"} className={kind === "sfx" ? "active" : ""} onClick={() => setKind("sfx")}>{t("ai.sfx")}</button>
        <button type="button" role="tab" aria-selected={kind === "bgm"} className={kind === "bgm" ? "active" : ""} onClick={() => setKind("bgm")}>{t("ai.bgm")}</button>
      </div>
      <label className="ai-audio-field">
        <span>{t("ai.prompt")}</span>
        <textarea value={prompt} maxLength={1000} rows={3} onChange={event => setPrompt(event.target.value)} />
      </label>
      <div className="ai-audio-options">
        <label><span>{t("ai.duration")} · {duration}s</span><input type="range" min={bounds.min} max={bounds.max} step={bounds.step} value={duration} onChange={event => setDuration(Number(event.target.value))} /></label>
        <label><span>{t("ai.variations")}</span><select value={variants} onChange={event => setVariants(Number(event.target.value))}><option value={1}>V1</option><option value={2}>{t("ai.twoVariants")}</option></select></label>
      </div>
      {kind === "bgm" && <p className="ai-audio-note">{t("ai.geminiDurationWarning")} {t("ai.loopWarning")}</p>}
      {account === "signed-out" && <p className="ai-audio-note">{t("ai.signIn")}</p>}
      {account === "unavailable" && <p className="ai-audio-note">{t("ai.unavailable")}</p>}
      <div className="ai-audio-actions"><button type="button" className="primary" disabled={busy || account !== "ready" || !prompt.trim()} onClick={() => void createAudio()}>{busy ? t("ai.generating") : t("ai.generate")}</button>{quote && <span>{t("ai.quote")}: {quote.credits} {t("ai.creditUnit")}</span>}</div>
      {message && <p className="ai-audio-message" role="status">{message}</p>}
      {results.length > 0 && <div className="ai-audio-results">{results.map(result => <article key={result.variant}>
        <strong>V{result.variant} · {result.durationSeconds === null ? t("ai.durationLoading") : `${result.durationSeconds}s`}</strong>
        <audio controls preload="metadata" src={result.localUrl} onLoadedMetadata={event => {
          const measured = event.currentTarget.duration;
          if (Number.isFinite(measured)) setResults(current => current.map(item => item.variant === result.variant
            ? { ...item, durationSeconds: Math.round(measured * 10) / 10 } : item));
        }} />
        <a href={result.localUrl} download={`resona-${kind}-v${result.variant}.${result.contentType === "audio/wav" ? "wav" : "mp3"}`}>{t("ai.download")}</a>
      </article>)}</div>}
      <p className="ai-audio-license">{t("ai.license")}</p>
    </section>
  );
}
