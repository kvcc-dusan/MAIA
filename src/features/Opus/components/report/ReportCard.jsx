import React from "react";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { FilterChips } from "../../kit";
import MarkdownView from "../docs/MarkdownView";
import styles from "./Report.module.css";

const MODES = [
  { value: "preview", label: "Preview" },
  { value: "markdown", label: "Markdown" },
];

/** The generated report: Preview or Markdown source, Copy markdown, Save as note. */
export default function ReportCard({ title, markdown, mode, onModeChange, savedNoteId, onSave, onOpenSaved }) {
  const isSaved = savedNoteId !== null;
  return (
    <section className={styles.card} aria-labelledby="report-card-title">
      <header className={styles.head}>
        <h2 id="report-card-title" className={styles.cardTitle}>{title}</h2>
        <FilterChips label="Report format" options={MODES} value={mode} onValueChange={onModeChange} />
      </header>
      <div className={styles.content}>
        {mode === "markdown" ? (
          <pre className={styles.source} tabIndex={0} aria-label="Report markdown">{markdown}</pre>
        ) : (
          <MarkdownView source={markdown} label="Report preview" />
        )}
      </div>
      {/* Always mounted so assistive tech hears the confirmation arrive. */}
      <div aria-live="polite">
        {isSaved && (
          <Alert tone="success" title="Saved to Codex">
            {onOpenSaved ? <Button variant="secondary" size="sm" onClick={onOpenSaved}>Open note</Button> : undefined}
          </Alert>
        )}
      </div>
      <footer className={styles.actions}>
        <CopyButton className={styles.copy} value={markdown} label="Copy markdown" />
        <Button onClick={onSave} disabled={isSaved}>{isSaved ? "Saved" : "Save as note"}</Button>
      </footer>
    </section>
  );
}
