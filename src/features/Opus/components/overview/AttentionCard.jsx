import React from "react";
import { CheckCircle2 } from "@/components/icons";
import { Button } from "@/components/arc/button/button";
import { SectionCard } from "@/components/composed/SectionCard";
import { ListRow, OwnerAvatar, humanDate } from "../../kit";
import styles from "./Cards.module.css";

const reasonOf = (item) => {
  if (item.isOverdue) return `Overdue ${item.daysLate} ${item.daysLate === 1 ? "day" : "days"}`;
  return "Blocked";
};

const SHOWN = 3;

/** Overdue and blocked tasks, most urgent first, as a slim strip under the header. Each row opens Tasks filtered the same way. */
export default function AttentionCard({ attention, workstreams, showOwners, navigate }) {
  const { total } = attention;
  const items = attention.items.slice(0, SHOWN);
  const nameOf = (id) => workstreams.find((w) => w.id === id)?.name;
  return (
    <SectionCard
      titleAs="h2"
      title="Needs attention"
      count={total || undefined}
      action={total > items.length ? (
        <Button variant="ghost" size="sm" onClick={() => navigate("tasks", { status: "overdue" })}>See all {total}</Button>
      ) : undefined}
      bodyClassName={styles.listBody}
    >
      {total === 0 ? (
        <p className={styles.clear}><CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" /> All clear. Nothing is overdue or blocked.</p>
      ) : (
        <ul className={styles.rows}>
          {items.map((item) => {
            const ws = nameOf(item.workstreamId);
            return (
              <li key={item.id}>
                <ListRow
                  title={item.title}
                  subtitle={
                    <span className={styles.reason}>
                      <span className={styles.dot} style={{ background: "var(--danger)" }} aria-hidden="true" />
                      {reasonOf(item)}{ws ? ` · ${ws}` : ""}
                    </span>
                  }
                  trailing={
                    <>
                      {showOwners ? <OwnerAvatar name={item.owner} showName /> : null}
                      {item.due ? <span className={styles.due}>{humanDate(item.due)}</span> : null}
                    </>
                  }
                  onClick={() => navigate("tasks", { status: item.isOverdue ? "overdue" : "blocked" })}
                  aria-label={`${item.title}. ${reasonOf(item)}. Open in Tasks`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
