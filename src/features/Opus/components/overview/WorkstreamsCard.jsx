import React from "react";
import { Layers } from "@/components/icons";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import Progress from "@/components/arc/progress/progress";
import { workstreamColor } from "../../kit";
import styles from "./Cards.module.css";

const counts = (p) => {
  const parts = [];
  if (p.overdue) parts.push({ key: "overdue", text: `${p.overdue} overdue` });
  if (p.blocked) parts.push({ key: "blocked", text: `${p.blocked} blocked` });
  return parts;
};

function WorkstreamCard({ p, onOpen }) {
  const flags = counts(p);
  return (
    <li className={styles.wsCard}>
      <div className={styles.wsHead}>
        <span className={styles.dot} style={{ background: workstreamColor(p) }} aria-hidden="true" />
        {/* The name is the one tab stop; its ::after stretches the click target over the card. */}
        <button type="button" className={styles.wsName} onClick={onOpen} aria-label={`Open ${p.name} on the board`}>{p.name}</button>
        <span className={styles.wsPct}>{p.pct}%</span>
      </div>
      <Progress value={p.done} max={p.total || 1} label={`${p.done} of ${p.total} done`} className={styles.wsBar} />
      <p className={styles.wsFlags}>
        {flags.length ? flags.map((f) => (
          <span key={f.key} className={styles.flagItem}>
            <span className={styles.dot} style={{ background: "var(--danger)" }} aria-hidden="true" />
            {f.text}
          </span>
        )) : <span className={styles.quiet}>No overdue or blocked</span>}
      </p>
    </li>
  );
}

/** One card per workstream, each opening the Board filtered to it. Adding one lives on the Roadmap. */
export default function WorkstreamsCard({ progress, navigate }) {
  return (
    <SectionCard titleAs="h2" title="Workstreams" count={progress.length || undefined} bodyClassName={styles.body}>
      {progress.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No workstreams yet"
          description="Add workstreams on the Roadmap to group the work."
          action={<Button variant="secondary" onClick={() => navigate("roadmap")}>Open roadmap</Button>}
        />
      ) : (
        <ul className={styles.wsGrid}>
          {progress.map((p) => <WorkstreamCard key={p.id} p={p} onOpen={() => navigate("board", { ws: p.id })} />)}
        </ul>
      )}
    </SectionCard>
  );
}
