import React from "react";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { Activity } from "lucide-react";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { LineChart } from "@/components/arc/line-chart/line-chart";
import { DonutChart } from "@/components/arc/donut-chart/donut-chart";
import { ActivityHeatmap } from "@/components/arc/activity-heatmap/activity-heatmap";
import { roundTenth } from "./dates";
import styles from "./Overview.module.css";

const CHART_HEIGHT = 240;
const SERIES = {
  scope: { key: "scope", label: "Scope", color: "var(--text-muted)", area: false },
  done: { key: "done", label: "Done", color: "var(--series-2)", area: true },
  projected: { key: "projected", label: "Projected done", color: "var(--series-2)", dashed: true, area: false },
};
const CHANGE_UNIT = { one: "change", other: "changes" };

const formatTasks = (value) => (Number.isInteger(value) ? String(value) : String(roundTenth(value)));

export function BurnupPanel({ burnup }) {
  const series = burnup.hasProjection ? [SERIES.scope, SERIES.done, SERIES.projected] : [SERIES.scope, SERIES.done];
  return (
    <SectionCard titleAs="h2" title="Burn-up" bodyClassName={styles.body}>
      <LineChart
        data={burnup.data}
        series={series}
        label="Burn-up: tasks in scope and tasks done per day, with a projected finish"
        unit="tasks"
        categoryLabel="Day"
        curve="linear"
        height={CHART_HEIGHT}
        formatValue={formatTasks}
        emptyLabel="No tasks to chart yet"
      />
      <p className={styles.note}>
        {burnup.forecast.text}
        {burnup.forecast.isLate && <Badge tone="warning" className={styles.noteBadge}>After target</Badge>}
      </p>
    </SectionCard>
  );
}

export function StatusPanel({ mix, navigate }) {
  return (
    <SectionCard titleAs="h2" title="Status" bodyClassName={styles.body}>
      <DonutChart
        data={mix}
        label="Tasks by status. Select a status to see those tasks."
        totalLabel="Tasks"
        unit="tasks"
        groupBelow={0}
        legendAction="select"
        activeKey={null}
        onActiveChange={(key) => key && navigate("tasks", { status: key })}
        emptyLabel="No tasks yet"
      />
    </SectionCard>
  );
}

export function ActivityPanel({ heat, navigate }) {
  return (
    <SectionCard titleAs="h2" title="Activity" bodyClassName={styles.body}>
      {heat.total === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Changes to tasks, workstreams, decisions and milestones show up here."
          action={<Button variant="secondary" onClick={() => navigate("tasks")}>Add a task</Button>}
        />
      ) : (
        <ActivityHeatmap
          days={heat.days}
          label="Changes per day over the last 26 weeks"
          period="the last 26 weeks"
          unit={CHANGE_UNIT}
          weekStartsOn={1}
        />
      )}
    </SectionCard>
  );
}
