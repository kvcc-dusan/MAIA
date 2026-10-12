import React from "react";
import { SidePanel } from "@/components/composed/SidePanel";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { FileText } from "@/components/icons";
import { StatusBadge } from "../../kit";
import MarkdownView from "./MarkdownView";
import { docSubtitle, docTitle } from "./docDisplay";
import styles from "./DocumentReader.module.css";

/** Read-only view of a document's markdown, with a way into the full editor. */
export default function DocumentReader({ note, project, onClose, onOpenInCodex }) {
  const hasBody = Boolean(note?.content?.trim());
  return (
    <SidePanel
      size="lg"
      open={Boolean(note)}
      onClose={onClose}
      title={note ? docTitle(note) : "Document"}
      description={note ? docSubtitle(note, project) : undefined}
      footer={note && onOpenInCodex ? (
        <Button onClick={() => onOpenInCodex(note.id)}>Open in Codex</Button>
      ) : undefined}
    >
      {note && (
        <div className={styles.body}>
          <div className={styles.meta}><StatusBadge status={note.status} /></div>
          {hasBody ? (
            <MarkdownView source={note.content} label={`${docTitle(note)} content`} />
          ) : (
            <EmptyState
              icon={FileText}
              title="This document is empty"
              description="Open it in Codex to write the content."
            />
          )}
        </div>
      )}
    </SidePanel>
  );
}
