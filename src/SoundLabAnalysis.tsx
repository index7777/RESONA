import { useI18n } from "./i18n";
import type { RefObject } from "react";
import type { Sound } from "./audio";
import type { AudioMetrics } from "./inspector";
import { fmtDb, fmtPct } from "./inspector";
import type { IterationReport } from "./report";
import { downloadReport } from "./report";
import type { SpectralBurst } from "./spectrogram";
import type { LayerAttribution } from "./attribution";
import type { OptimizeResult } from "./optimizer";
import { downloadOptimization } from "./optimizer";

type Props = {
  sound: Sound;
  metrics: AudioMetrics | null;
  report: IterationReport | null;
  optimization: OptimizeResult | null;
  bursts: SpectralBurst[];
  attribution: LayerAttribution[];
  waveformRef: RefObject<HTMLCanvasElement | null>;
  spectrogramRef: RefObject<HTMLCanvasElement | null>;
  onAutoFix: () => void;
  onSurgicalFix: () => void;
};

export function SoundLabAnalysis({
  sound,
  metrics,
  report,
  optimization,
  bursts,
  attribution,
  waveformRef,
  spectrogramRef,
  onAutoFix,
  onSurgicalFix,
}: Props) {
  const { t, text } = useI18n();
  return (
    <>
      {optimization ? (
        <section className="optimizer panel">
          <div className="panel-title">
            <span>
              Agent Optimize{" "}
              <button
                className="mini"
                onClick={() => downloadOptimization(optimization, sound.name)}
              >
                JSON
              </button>
            </span>
            <small className={optimization.verified ? "clean" : "warning"}>
              {optimization.verified ? "VERIFIED" : optimization.stopReason}
            </small>
          </div>
          <div className="opt-steps">
            {optimization.steps.map((step) => (
              <div key={step.iteration}>
                <strong>
                  #{step.iteration} · {step.issue}
                </strong>
                <span>{step.action}</span>
                <code>
                  {step.before.peakDb.toFixed(1)} →{" "}
                  {step.after.peakDb.toFixed(1)} dB · clipped{" "}
                  {step.before.clipped} → {step.after.clipped}
                  {step.target ? ` · ${step.target}` : ""}
                </code>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="inspector panel">
        <div className="panel-title">
          <span>
            {t("sound.inspector")} · {t("music.seed")} {sound.seed}{" "}
            <button
              className="mini fix"
              disabled={!metrics || metrics.status === "clean"}
              onClick={onAutoFix}
            >
              {t("sound.autoFix")}
            </button>
          </span>
          <small className={metrics?.status}>
            {text(metrics?.status ?? "rendering")}
          </small>
        </div>
        <div className="metric-grid">
          <div>
            <small>{t("metric.peak")}</small>
            <strong>{metrics ? fmtDb(metrics.peakDb) : "—"}</strong>
          </div>
          <div>
            <small>{t("metric.rms")}</small>
            <strong>{metrics ? fmtDb(metrics.rmsDb) : "—"}</strong>
          </div>
          <div>
            <small>{t("metric.crest")}</small>
            <strong>
              {metrics ? `${metrics.crestDb.toFixed(1)} dB` : "—"}
            </strong>
          </div>
          <div>
            <small>{t("metric.dc")}</small>
            <strong>{metrics ? metrics.dc.toFixed(4) : "—"}</strong>
          </div>
          <div>
            <small>{t("metric.clipped")}</small>
            <strong>{metrics?.clipped ?? "—"}</strong>
          </div>
        </div>
        <div className="spectral-grid">
          <div>
            <small>{t("metric.centroid")}</small>
            <strong>
              {metrics ? `${Math.round(metrics.centroidHz)} Hz` : "—"}
            </strong>
          </div>
          <div>
            <small>{t("metric.sub")}</small>
            <strong>{metrics ? fmtPct(metrics.lowRatio) : "—"}</strong>
          </div>
          <div>
            <small>{t("metric.air")}</small>
            <strong>{metrics ? fmtPct(metrics.highRatio) : "—"}</strong>
          </div>
        </div>
        {metrics?.issues.length ? (
          <div className="issues">
            {metrics.issues.map((issue) => (
              <span key={issue}>{issue}</span>
            ))}
          </div>
        ) : (
          <div className="issues clean">{t("sound.noAnomaly")}</div>
        )}
      </section>
      {report ? (
        <section className="iteration panel">
          <div className="panel-title">
            <span>{t("sound.iterationReport")}</span>
            <button
              className="mini"
              onClick={() => downloadReport(report, sound.name)}
            >
              {t("common.jsonReport")}
            </button>
          </div>
          <div className="iteration-row">
            <strong>{report.verified ? "VERIFIED" : "REVIEW"}</strong>
            <span>
              Peak {report.before.peakDb.toFixed(1)} →{" "}
              {report.after.peakDb.toFixed(1)} dB
            </span>
            <span>
              Clipped {report.before.clipped} → {report.after.clipped}
            </span>
            <span>Gain × {report.fix.gainScale.toFixed(3)}</span>
          </div>
        </section>
      ) : null}
      <section className="spectrogram-panel panel">
        <div className="panel-title">
          <span>{t("sound.timeFrequency")}</span>
          <small>
            {bursts.length
              ? `${bursts.length} burst${bursts.length > 1 ? "s" : ""}`
              : t("sound.noBursts")}
          </small>
        </div>
        <canvas ref={spectrogramRef} width={1200} height={260} />
        {bursts.length ? (
          <div className="burst-list">
            {bursts.map((burst, index) => (
              <span key={`${burst.startMs}-${index}`}>
                {Math.round(burst.startMs)}–{Math.round(burst.endMs)} ms ·{" "}
                {Math.round(burst.lowHz / 1000)}–
                {Math.round(burst.highHz / 1000)} kHz · ×
                {burst.score.toFixed(1)}
              </span>
            ))}
          </div>
        ) : null}
      </section>
      <section className="attribution panel">
        <div className="panel-title">
          <span>{t("sound.layerAttribution")}</span>
          <button
            className="mini fix"
            disabled={!attribution[0] || attribution[0].score < 0.08}
            onClick={onSurgicalFix}
          >
            {t("sound.surgicalFix")}
          </button>
        </div>
        {attribution.map((item, index) => (
          <div
            className={`suspect ${index === 0 ? "top" : ""}`}
            key={item.layerId}
          >
            <strong>
              {index === 0 ? "SUSPECT · " : ""}
              {item.layerId}
            </strong>
            <span>{item.reason}</span>
            <code>
              Matched energy {(item.highRatio * 100).toFixed(1)}% · windows{" "}
              {item.burstCount} · score {item.score.toFixed(3)}
            </code>
          </div>
        ))}
      </section>
      <section className="wave-panel panel">
        <div className="panel-title">
          <span>{t("sound.waveform")}</span>
          <small>{t("sound.waveformMeta")}</small>
        </div>
        <canvas ref={waveformRef} width={1200} height={180} />
      </section>
    </>
  );
}
