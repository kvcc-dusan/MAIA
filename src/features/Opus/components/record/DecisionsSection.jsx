import React, { useMemo } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { SectionCard } from "@/components/composed/SectionCard";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import { EmptyState } from "@/components/composed/EmptyState";
import { groupDecisionsByMonth, shouldGroupByMonth, sortDecisions } from "./decisions";
import { findWorkstream } from "./workstreams";
import DecisionRow from "./DecisionRow";
import styles from "./record.module.css";

const SECTION = "decisions";

/** Reverse-chronological log; month headers appear once the log is long enough to need them. */
export default function DecisionsSection({ decisions, workstreamsById, today, onAdd, onEdit, onDelete }) {
  const sorted = useMemo(() => sortDecisions(decisions), [decisions]);
  const groups = useMemo(
    () => (shouldGroupByMonth(sorted.length) ? groupDecisionsByMonth(sorted) : null),
    [sorted],
  );
  const isEmpty = sorted.length === 0;

  const renderRows = (items) =>
    items.map((decision) => (
      <DecisionRow
        key={decision.id}
        decision={decision}
        workstream={findWorkstream(workstreamsById, decision.workstreamId)}
        today={today}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ));

  return (
    <SectionCard
      role="region"
      aria-label="Decisions"
      data-section={SECTION}
      className={styles.section}
      title="Decisions"
      titleAs="h2"
      count={isEmpty ? undefined : sorted.length}
      action={isEmpty ? null : <Button variant="secondary" onClick={onAdd}>Add decision</Button>}
    >
      {isEmpty ? (
        <EmptyState
          icon={GitBranch}
          title="No decisions logged"
          description="Decisions record what was settled, by whom and why, so nobody has to ask twice. Log the first one."
          action={<Button variant="secondary" onClick={onAdd}>Add decision</Button>}
        />
      ) : groups ? (
        groups.map((group) => (
          <div key={group.key || "undated"} className={styles.group}>
            <div className={styles.groupHeader}>
              <SectionLabel as="h3">{group.label}</SectionLabel>
              <CountPill size="sm">{group.items.length}</CountPill>
            </div>
            <ul className={styles.list} role="list">{renderRows(group.items)}</ul>
          </div>
        ))
      ) : (
        <ul className={styles.list} role="list">{renderRows(sorted)}</ul>
      )}
    </SectionCard>
  );
}
