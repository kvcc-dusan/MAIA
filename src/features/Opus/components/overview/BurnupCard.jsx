import React, { useId, useState } from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { LineChart } from "@/components/arc/line-chart/line-chart";
import styles from "./Cards.module.css";

const CHART_HEIGHT = 240;
const SERIES = {
  scope: { key: "scope", label: "Scope", color: "var(--text-muted)", area: false },
  done: { key: "done", label: "Done", color: "var(--series-2)", area: true },
  projected: { key: "projected", label: "Projected done", color: "var(--series-2)", dashed: true, area: false },
};
const fmt = (v) => (v == null ? "" : String(Math.round(v * 10) / 10));

function DataTable({ rows, hasProjection, id }) {
  return (
    <div id={id} className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Burn-up data, one row a week plus today and the target date</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Scope</th>
            <th scope="col">Done</th>
            {hasProjection ? <th scope="col">Projected</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}{r.mark ? ` (${r.mark.toLowerCase()})` : ""}</th>
              <td>{fmt(r.scope)}</td>
              <td>{fmt(r.done)}</td>
              {hasProjection ? <td>{fmt(r.projected)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Forecast sentence, legend with latest values, the chart and a toggleable data table. */
export default function BurnupCard({ overview }) {
  const { burnup, forecast, legend, tableRows } = overview;
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const series = burnup.hasProjection ? [SERIES.scope, SERIES.done, SERIES.projected] : [SERIES.scope, SERIES.done];
  return (
    <SectionCard titleAs="h2" title="Burn-up" bodyClassName={styles.body}>
      {forecast.text ? (
        <p className={styles.forecast}>
          {forecast.text}
          {forecast.isLate ? <Badge tone="warning" className={styles.flag}>After the target date</Badge> : null}
        </p>
      ) : null}
      <ul className={styles.legend} aria-label="Latest values">
        {legend.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span className={`${styles.swatch} ${item.dashed ? styles.dashed : ""}`} style={{ "--swatch": item.color }} aria-hidden="true" />
            <span>{item.label}</span>
            <span className={styles.legendValue}>{fmt(item.value)}{item.note ? ` ${item.note}` : ""}</span>
          </li>
        ))}
      </ul>
      <LineChart
        data={burnup.data}
        series={series}
        label="Burn-up: tasks in scope and tasks done per day, with a projected finish. Today and the target date are marked on the axis."
        unit="tasks"
        categoryLabel="Day"
        curve="linear"
        height={CHART_HEIGHT}
        formatValue={fmt}
        legend={false}
        emptyLabel="No tasks to chart yet"
      />
      <div className={styles.tableToggle}>
        <Button variant="ghost" size="sm" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Hide data table" : "Show data table"}
        </Button>
      </div>
      {showTable ? <DataTable id={tableId} rows={tableRows} hasProjection={burnup.hasProjection} /> : null}
    </SectionCard>
  );
}
