// The next open milestones that have a date, soonest first. Past-due ones stay
// in (they sort first) and are flagged.
import { day } from "../../lib/metrics.js";

export const MAX_MILESTONES = 3;

export const MILESTONE_STATUS = {
  planned: { label: "Planned", tone: "neutral" },
  active: { label: "Active", tone: "info" },
  "at-risk": { label: "At risk", tone: "warning" },
  done: { label: "Done", tone: "success" },
};

export const upcomingMilestones = (milestones, workstreams, today, limit = MAX_MILESTONES) => {
  const names = new Map(workstreams.map((w) => [w.id, w.name]));
  return milestones
    .filter((m) => m.status !== "done" && day(m.date))
    .sort((a, b) => day(a.date).localeCompare(day(b.date)) || String(a.title).localeCompare(String(b.title)))
    .slice(0, limit)
    .map((m) => {
      const status = MILESTONE_STATUS[m.status] ?? MILESTONE_STATUS.planned;
      return {
        id: m.id,
        title: m.title || "Untitled milestone",
        date: day(m.date),
        isPast: day(m.date) < today,
        statusLabel: status.label,
        tone: status.tone,
        workstreamName: names.get(m.workstreamId) ?? null,
      };
    });
};
