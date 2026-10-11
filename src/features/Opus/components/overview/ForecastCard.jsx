import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { Badge } from "@/components/arc/badge/badge";
import { humanDate } from "../../kit";
import { forecastTrack } from "./forecastTrack";
import styles from "./Cards.module.css";

const days = (n) => `${n} ${n === 1 ? "day" : "days"}`;

const verdict = (lateDays) => {
  if (lateDays == null) return null;
  if (lateDays > 0) return { text: `${days(lateDays)} after target`, tone: "warning" };
  if (lateDays < 0) return { text: `${days(-lateDays)} before target`, tone: "success" };
  return { text: "On the target date", tone: "success" };
};

/** Where Today, the Target and the forecast finish fall on one line, with the pace as text. */
export default function ForecastCard({ forecast, startDate, targetDate, today }) {
  const track = forecastTrack({ start: startDate, today, target: targetDate, finish: forecast.finishDate });
  const status = verdict(track.lateDays);
  const markers = [
    { key: "today", label: "Today", date: today, at: track.today },
    targetDate ? { key: "target", label: "Target", date: targetDate, at: track.target } : null,
    forecast.finishDate ? { key: "finish", label: "Forecast", date: forecast.finishDate, at: track.finish } : null,
  ].filter(Boolean);
  return (
    <SectionCard titleAs="h2" title="Forecast" bodyClassName={styles.body}>
      <p className={styles.forecast}>
        {forecast.text || "Add a task to see a forecast"}
        {status ? <Badge tone={status.tone} className={styles.flag}>{status.text}</Badge> : null}
      </p>
      <div className={styles.track} role="img" aria-label={markers.map((m) => `${m.label} ${humanDate(m.date)}`).join(", ")}>
        <span className={styles.trackLine} />
        <span className={styles.trackElapsed} style={{ width: `${track.today}%` }} />
        {markers.map((m) => (
          <span key={m.key} className={styles.mark} data-kind={m.key} data-late={m.key === "finish" && track.lateDays > 0 ? "" : undefined} style={{ left: `${m.at}%` }} />
        ))}
      </div>
      <ul className={styles.trackLegend}>
        {markers.map((m) => (
          <li key={m.key} className={styles.trackItem}>
            <span className={styles.legendMark} data-kind={m.key} data-late={m.key === "finish" && track.lateDays > 0 ? "" : undefined} aria-hidden="true" />
            <span>{m.label}</span>
            <span className={styles.trackDate}>{humanDate(m.date)}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
