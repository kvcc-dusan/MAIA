import React from "react";
import { CheckCircle2, Flag } from "lucide-react";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { formatDay, plural } from "./dates";
import styles from "./Overview.module.css";

export function MilestonesPanel({ milestones, today, navigate }) {
  return (
    <SectionCard titleAs="h2" title="Next milestones" bodyClassName={styles.listBody}>
      {milestones.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No open milestones with a date"
          description="Milestones mark the checkpoints on the way to the target date."
          action={<Button variant="secondary" onClick={() => navigate("roadmap")}>Open Roadmap</Button>}
        />
      ) : (
        <ul className={styles.list}>
          {milestones.map((m) => (
            <li key={m.id}>
              <button type="button" className={styles.row} onClick={() => navigate("roadmap")}>
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{m.title}</span>
                  <span className={styles.rowMeta}>
                    {formatDay(m.date, today)}
                    {m.isPast && " (past due)"}
                    {m.workstreamName && `, ${m.workstreamName}`}
                  </span>
                </span>
                <Badge tone={m.tone}>{m.statusLabel}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

const dueText = (item, today) => {
  if (!item.due) return "No due date";
  const date = `Due ${formatDay(item.due, today)}`;
  return item.isOverdue ? `${date}, ${plural(item.daysLate, "day")} late` : date;
};

export function AttentionPanel({ attention, today, navigate }) {
  const { items, total } = attention;
  return (
    <SectionCard titleAs="h2" title="Needs attention" count={total || undefined} bodyClassName={styles.listBody}>
      {total === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing is overdue or blocked"
          description="Overdue and blocked tasks appear here as soon as there are any."
        />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => navigate("tasks", { status: item.isBlocked ? "blocked" : "overdue" })}
                >
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{item.title}</span>
                    <span className={styles.rowMeta}>{dueText(item, today)}</span>
                  </span>
                  <span className={styles.badges}>
                    {item.isOverdue && <Badge tone="warning">Overdue</Badge>}
                    {item.isBlocked && <Badge tone="danger">Blocked</Badge>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {total > items.length && <p className={styles.note}>Showing {items.length} of {total}</p>}
        </>
      )}
    </SectionCard>
  );
}
