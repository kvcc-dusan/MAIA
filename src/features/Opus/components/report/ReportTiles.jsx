import React from "react";
import { MetricTile } from "../../kit";
import { tileFacts } from "./reportWeeks";
import styles from "./Report.module.css";

/** Done, Started, Slipped, Blocking for the chosen week. Copy follows the hub. */
export default function ReportTiles({ summary }) {
  const { done, started, slipped, blocking } = tileFacts(summary);
  return (
    <div className={styles.tiles}>
      <MetricTile label="Done" value={done} context="Finished this week" />
      <MetricTile label="Started" value={started} context="Moved to in progress" />
      <MetricTile
        label="Slipped"
        value={slipped}
        tone={slipped ? "warning" : undefined}
        context={slipped ? "Due this week, still open" : "Nothing slipped"}
      />
      <MetricTile
        label="Blocking"
        value={blocking}
        tone={blocking ? "danger" : undefined}
        context={blocking ? "Blocked tasks and questions" : "Nothing blocking"}
      />
    </div>
  );
}
