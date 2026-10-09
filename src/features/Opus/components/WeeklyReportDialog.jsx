import React, { useMemo, useState } from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { useData } from "@/context/DataContext";
import { buildReportSummary, reportMarkdown, reportNoteTitle } from "../lib/report";
import { label as shortDate, toDayString, weekRange } from "../lib/metrics";
import styles from "./WeeklyReportDialog.module.css";

// `offset` is whole weeks from the current Monday-to-Sunday week.
const WEEKS = [
  { value: "this", label: "This week", offset: 0 },
  { value: "last", label: "Last week", offset: -1 },
];
const WEEK_OPTIONS = WEEKS.map(({ value, label }) => ({ value, label }));

/**
 * The dialog body is its own component so its state (chosen week, saved note)
 * starts fresh every time the dialog opens: Arc unmounts the content on close.
 */
function ReportBody({ project, selectNote, onClose }) {
  const { tasks, createNote } = useData();
  // Local calendar day, read once per open so a dialog left open overnight
  // doesn't shift its own week under the reader.
  const [today] = useState(() => toDayString(new Date()));
  const [weekId, setWeekId] = useState("this");
  const [savedNoteId, setSavedNoteId] = useState(null);

  const offset = WEEKS.find((w) => w.value === weekId)?.offset ?? 0;
  const range = useMemo(() => weekRange(today, offset), [today, offset]);

  const report = useMemo(() => {
    try {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const summary = buildReportSummary({ project, tasks: projectTasks, range, today });
      return { markdown: reportMarkdown({ project, summary, range }), failed: false };
    } catch (error) {
      console.error("WeeklyReportDialog: could not build the report", error);
      return { markdown: "", failed: true };
    }
  }, [project, tasks, range, today]);

  // A saved note belongs to one week; picking the other week starts a new report.
  const handleWeekChange = (next) => {
    setWeekId(next);
    setSavedNoteId(null);
  };

  const handleSave = () => {
    const id = createNote({
      title: reportNoteTitle(project, range),
      // Tags are re-derived from inline #tags whenever the note is edited, so the tag has to live in the text too.
      content: `${report.markdown.trimEnd()}\n\n#report\n`,
      tags: ["report"],
      projectIds: [project.id],
    });
    setSavedNoteId(id);
  };

  const handleOpenNote = () => {
    onClose();
    selectNote(savedNoteId);
  };

  const isSaved = savedNoteId !== null;

  return (
    <div className={styles.body}>
      <div className={styles.controls}>
        <SegmentedControl label="Report week" options={WEEK_OPTIONS} value={weekId} onValueChange={handleWeekChange} />
        <span className={styles.range}>{shortDate(range.from)} to {shortDate(range.to)}</span>
      </div>

      {report.failed ? (
        <Alert tone="danger" title="Couldn't build this report">
          Some task or milestone data is in a shape the report can't read. Check the project data and try again.
        </Alert>
      ) : (
        <pre className={styles.preview} tabIndex={0} aria-label="Report markdown">{report.markdown}</pre>
      )}

      {/* Always mounted so assistive tech hears the confirmation arrive. */}
      <div aria-live="polite">
        {isSaved && (
          <Alert tone="success" title="Saved to Codex">
            {selectNote ? (
              <Button variant="secondary" size="sm" onClick={handleOpenNote}>Open note</Button>
            ) : undefined}
          </Alert>
        )}
      </div>

      <div className={styles.actions}>
        <CopyButton className={styles.copy} value={report.markdown} label="Copy markdown" disabled={report.failed} />
        <Button onClick={handleSave} disabled={report.failed || isSaved}>
          {isSaved ? "Saved" : "Save as note"}
        </Button>
      </div>
    </div>
  );
}

export default function WeeklyReportDialog({ open, onClose, project, selectNote }) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Weekly report"
      description="A markdown summary of the week. Copy it or save it to Codex."
    >
      <ReportBody project={project} selectNote={selectNote} onClose={onClose} />
    </AppDialog>
  );
}
