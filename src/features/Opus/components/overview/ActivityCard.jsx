import React from "react";
import { Activity } from "lucide-react";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import { ActivityHeatmap } from "@/components/arc/activity-heatmap/activity-heatmap";
import styles from "./Cards.module.css";

const CHANGE_UNIT = { one: "change", other: "changes" };

/** A year of changes as a heatmap, with the summary as one quiet line under it. The change feed lives with Claude over MCP (`list_activity`). */
export default function ActivityCard({ heat, navigate }) {
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
        <>
          <ActivityHeatmap days={heat.days} label="Changes per day over the past year" period="the past year" unit={CHANGE_UNIT} weekStartsOn={1} className={styles.heat} />
          <p className={styles.summary}>{heat.summary.text}</p>
        </>
      )}
    </SectionCard>
  );
}
