import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { GroupCard, ListRow, humanDate } from "../../kit";
import { HISTORY_PAGE_SIZE } from "./reportHistory";
import styles from "./ReportHistoryCard.module.css";

/** Saved reports for the project, newest first. Shows eight, then "Show all N". */
export default function ReportHistoryCard({ reports, onOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTruncated = reports.length > HISTORY_PAGE_SIZE && !isExpanded;
  const visible = isTruncated ? reports.slice(0, HISTORY_PAGE_SIZE) : reports;

  return (
    <GroupCard title="History" meta={`${reports.length} saved`}>
      {visible.map((note) => (
        <ListRow
          key={note.id}
          title={note.title}
          subtitle={humanDate(note.createdAt)}
          trailing={onOpen ? (
            <Button variant="secondary" size="sm" onClick={() => onOpen(note.id)} aria-label={`Open in Codex: ${note.title}`}>
              Open in Codex
            </Button>
          ) : undefined}
        />
      ))}
      {isTruncated ? (
        <div className={styles.more}>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
            {`Show all ${reports.length}`}
          </Button>
        </div>
      ) : null}
    </GroupCard>
  );
}
