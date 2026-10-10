import { statusLabel } from "../../kit/format";

const NOUN = { workstreams: "workstream", tasks: "task", milestones: "milestone", decisions: "decision", questions: "question" };

/** "Marked “X” done", "Moved “X” to In progress", "Created task “X”" */
export const activitySentence = (a) => {
  const title = `“${a.title || "Untitled"}”`;
  const noun = NOUN[a.collection] ?? "item";
  if (a.kind === "created") return `Created ${noun} ${title}`;
  if (a.kind === "deleted") return `Deleted ${noun} ${title}`;
  if (a.kind === "status") {
    if (a.collection === "tasks" && a.to === "done") return `Marked ${title} done`;
    const to = statusLabel(a.to) || "a new status";
    return a.collection === "tasks" ? `Moved ${title} to ${to}` : `Moved ${noun} ${title} to ${to}`;
  }
  return `Updated ${noun} ${title}`;
};
