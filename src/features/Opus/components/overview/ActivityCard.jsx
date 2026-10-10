import React from "react";
import { Activity } from "lucide-react";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import { ActivityHeatmap } from "@/components/arc/activity-heatmap/activity-heatmap";
import { ListRow } from "../../kit";
import { activitySentence } from "./activitySentence";
import styles from "./Cards.module.css";

const CHANGE_UNIT = { one: "change", other: "changes" };

/** 26-week heatmap, the summary line, then the newest changes. */
export default function ActivityCard({ heat, feed, navigate }) {
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
          <p className={styles.summary}>{heat.summary.text}</p>
          <ActivityHeatmap days={heat.days} label="Changes per day over the last 26 weeks" period="the last 26 weeks" unit={CHANGE_UNIT} weekStartsOn={1} />
          <ul className={styles.feed} aria-label="Recent changes">
            {feed.map((a, i) => (
              <li key={`${a.at}-${a.itemId}-${i}`}>
                <ListRow title={activitySentence(a)} trailing={<span className={styles.ago}>{a.ago}</span>} />
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
