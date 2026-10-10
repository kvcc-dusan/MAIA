import React from "react";
import { MetricTile } from "../../kit";
import Sparkline from "./Sparkline";
import styles from "./StatTiles.module.css";

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function InlineLink({ onClick, children }) {
  return <button type="button" className={styles.inline} onClick={onClick}>{children}</button>;
}

/** The four headline tiles. Overdue and Blocking link to the filtered lists. */
export default function StatTiles({ overview, navigate }) {
  const { tiles, total } = overview;
  const { blocking } = tiles;
  return (
    <div className={styles.grid}>
      <MetricTile
        label="Open tasks"
        value={tiles.open}
        unit={`/${total}`}
        context={`${tiles.doing} in progress`}
        link={{ label: "View tasks", onClick: () => navigate("tasks") }}
      />
      <MetricTile
        label="Done this week"
        value={tiles.thisWeek}
        context={`${tiles.average} per week on average`}
      >
        <Sparkline values={tiles.weekly.map((w) => w.count)} label="Done per week, 8 weeks" />
      </MetricTile>
      <MetricTile
        label="Overdue"
        value={tiles.overdue}
        tone={tiles.overdue ? "danger" : undefined}
        context={tiles.overdue ? `${count(tiles.overdue, "task")} past due` : "Nothing is overdue"}
        link={tiles.overdue ? { label: "View overdue tasks", onClick: () => navigate("tasks", { status: "overdue" }) } : undefined}
      />
      <MetricTile
        label="Blocking"
        value={blocking.total}
        tone={blocking.total ? "danger" : undefined}
        context={
          blocking.total ? (
            <span>
              <InlineLink onClick={() => navigate("tasks", { status: "blocked" })}>{count(blocking.tasks, "task")}</InlineLink>
              {", "}
              <InlineLink onClick={() => navigate("questions", { q: "blocking" })}>{count(blocking.questions, "question")}</InlineLink>
            </span>
          ) : "Nothing is blocking"
        }
      />
    </div>
  );
}
