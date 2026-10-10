import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { ListRow, OwnerAvatar, humanDate } from "../../kit";
import styles from "./Cards.module.css";

const reasonOf = (item) => {
  if (item.isOverdue) return `Overdue ${item.daysLate} ${item.daysLate === 1 ? "day" : "days"}`;
  return "Blocked";
};

/** Overdue and blocked tasks, most urgent first. Each row opens Tasks filtered the same way. */
export default function AttentionCard({ attention, workstreams, showOwners, navigate }) {
  const { items, total } = attention;
  const nameOf = (id) => workstreams.find((w) => w.id === id)?.name;
  return (
    <SectionCard
      titleAs="h2"
      title="Needs attention"
      count={total ? (total > items.length ? `${items.length} of ${total}` : total) : undefined}
      bodyClassName={styles.listBody}
    >
      {total === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing needs attention" description="Overdue and blocked tasks appear here as soon as there are any." />
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
