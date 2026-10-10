// Saved weekly reports for one project, newest first. A report is a note tagged "report" or containing #report.
export const HISTORY_PAGE_SIZE = 8;

const REPORT_TAG = "report";
const REPORT_HASHTAG = /#report(?![\w-])/i;

const isReportNote = (note) =>
  (note.tags ?? []).includes(REPORT_TAG) || REPORT_HASHTAG.test(String(note.content ?? ""));

const timeOf = (note) => {
  const time = Date.parse(note.createdAt ?? "");
  return Number.isNaN(time) ? -Infinity : time;
};

/** Report notes linked to `projectId`, newest first. Notes without a valid createdAt sort last. */
export const savedReports = (notes, projectId) =>
  (notes ?? [])
    .filter((note) => (note.projectIds ?? []).includes(projectId) && isReportNote(note))
    .sort((a, b) => timeOf(b) - timeOf(a));
