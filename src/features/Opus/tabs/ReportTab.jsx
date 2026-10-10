import React, { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/arc/alert/alert";
import { EmptyState } from "@/components/composed/EmptyState";
import { Select } from "@/components/composed/Select";
import { useData } from "@/context/DataContext";
import { FilterChips, PageBar } from "../kit";
import { label as shortDate, toDayString } from "../lib/metrics";
import { buildReportSummary, reportMarkdown, reportNoteTitle } from "../lib/report";
import ReportCard from "../components/report/ReportCard";
import ReportTiles from "../components/report/ReportTiles";
import ReportHistoryCard from "../components/report/ReportHistoryCard";
import { savedReports } from "../components/report/reportHistory";
import {
  OLDER_PLACEHOLDER, chipValue, olderWeekOptions, rangeLabel, weekRanges,
} from "../components/report/reportWeeks";
import styles from "./ReportTab.module.css";

const WEEK_CHIPS = [
  { value: "0", label: "This week" },
  { value: "1", label: "Last week" },
];

const weekTitle = (range) => `Week of ${shortDate(range.from)}`;

export default function ReportTab({ project, selectNote }) {
  const { tasks, notes, createNote } = useData();
  // Read once so a page left open overnight does not shift its own week.
  const [today] = useState(() => toDayString(new Date()));
  const [weeksBack, setWeeksBack] = useState(0);
  const [mode, setMode] = useState("preview");
  const [saved, setSaved] = useState({}); // range.from -> note id, so each week saves once

  const ranges = useMemo(() => weekRanges(today), [today]);
  const range = ranges[weeksBack];
  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === project.id), [tasks, project.id]);
  const history = useMemo(() => savedReports(notes, project.id), [notes, project.id]);

  const report = useMemo(() => {
    try {
      const summary = buildReportSummary({ project, tasks: projectTasks, range, today });
      return { summary, markdown: reportMarkdown({ project, summary, range }), failed: false };
    } catch (error) {
      console.error("ReportTab: could not build the report", error);
      return { summary: null, markdown: "", failed: true };
    }
  }, [project, projectTasks, range, today]);

  const handleSave = () => {
    const id = createNote({
      title: reportNoteTitle(project, range),
      // Tags are re-derived from inline #tags whenever the note is edited, so the tag has to live in the text too.
      content: `${report.markdown.trimEnd()}\n\n#report\n`,
      tags: ["report"],
      projectIds: [project.id],
    });
    setSaved((current) => ({ ...current, [range.from]: id }));
  };

  const savedNoteId = saved[range.from] ?? null;
  const olderValue = weeksBack >= 2 ? String(weeksBack) : null;

  return (
    <div className={styles.page}>
      <PageBar>
        <FilterChips
          label="Report week"
          options={WEEK_CHIPS}
          value={chipValue(weeksBack)}
          onValueChange={(next) => setWeeksBack(Number(next))}
        />
        <div className={styles.older}>
          <Select
            label={OLDER_PLACEHOLDER}
            labelClassName="sr-only"
            value={olderValue}
            options={olderWeekOptions(ranges)}
            onChange={(next) => next != null && setWeeksBack(Number(next))}
            placeholder={OLDER_PLACEHOLDER}
          />
        </div>
        <span className={styles.range}>{rangeLabel(range)}</span>
      </PageBar>

      {report.failed ? (
        <Alert tone="danger" title="Couldn't build this report">
          Some task or milestone data is in a shape the report can't read. Check the project data and try again.
        </Alert>
      ) : projectTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing to report yet"
          description="The report fills in as work happens: tasks get created, started and finished. Add a task on the Tasks page to begin."
        />
      ) : (
        <>
          <ReportTiles summary={report.summary} />
          <ReportCard
            title={weekTitle(range)}
            markdown={report.markdown}
            mode={mode}
            onModeChange={setMode}
            savedNoteId={savedNoteId}
            onSave={handleSave}
            onOpenSaved={selectNote ? () => selectNote(savedNoteId) : undefined}
          />
        </>
      )}
      {history.length > 0 ? <ReportHistoryCard reports={history} onOpen={selectNote} /> : null}
    </div>
  );
}
