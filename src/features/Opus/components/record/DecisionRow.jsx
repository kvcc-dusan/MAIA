import React, { useId, useState } from "react";
import { Button } from "@/components/arc/button/button";
import { clipDetail, clipText } from "./text";
import { dayOf, formatDecisionDate } from "./decisions";
import WorkstreamTag from "./WorkstreamTag";
import styles from "./record.module.css";

/** One logged decision: when, what, who decided, and the reasoning behind a "Show more". */
export default function DecisionRow({ decision, workstream, today, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailId = useId();
  const day = dayOf(decision.date);
  const name = clipText(decision.title, 48);
  const { text: collapsed, isClipped } = clipDetail(decision.detail);
  const hasMeta = Boolean(decision.by) || Boolean(workstream);

  return (
    <li className={`${styles.row} ${styles.decisionRow}`} data-row-id={decision.id}>
      <time className={styles.date} dateTime={day || undefined}>
        {formatDecisionDate(decision.date, today)}
      </time>

      <div className={styles.main}>
        <p className={styles.title}>{decision.title}</p>
        {hasMeta && (
          <div className={styles.meta}>
            {decision.by && <span>Decided by {decision.by}</span>}
            <WorkstreamTag workstream={workstream} />
          </div>
        )}
        {decision.detail && (
          <>
            <p id={detailId} className={styles.detail}>
              {isExpanded || !isClipped ? decision.detail : collapsed}
            </p>
            {isClipped && (
              <Button
                variant="ghost"
                size="sm"
                className={`${styles.action} ${styles.more}`}
                aria-expanded={isExpanded}
                aria-controls={detailId}
                aria-label={`${isExpanded ? "Show less" : "Show more"} of decision: ${name}`}
                onClick={() => setIsExpanded((current) => !current)}
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            )}
          </>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" className={styles.action} aria-label={`Edit decision: ${name}`} onClick={() => onEdit(decision.id)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" className={styles.action} aria-label={`Delete decision: ${name}`} onClick={() => onDelete(decision)}>
          Delete
        </Button>
      </div>
    </li>
  );
}
