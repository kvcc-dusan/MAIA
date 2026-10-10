const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86400000;
const SOON_DAYS = 3;

const STATUS_LABELS = {
  todo: "To do",
  doing: "In progress",
  blocked: "Blocked",
  done: "Done",
  open: "Open",
  answered: "Answered",
  draft: "Draft",
  current: "Current",
  notStarted: "Not started",
  superseded: "Superseded",
  planned: "Planned",
  active: "Active",
  atRisk: "At risk",
};

const PRIORITY_LABELS = { p1: "High", p2: "Medium", p3: "Normal" };

const parseDay = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

const toNum = (parts) => Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS;

/** "Sara Vidmar" -> "SV", "Ana" -> "A", empty -> "". */
export const initials = (name) => {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

/** "8 Oct", or "8 Oct 2026" when the year is not `currentYear` (defaults to this year). */
export const humanDate = (iso, currentYear = new Date().getFullYear()) => {
  const parts = parseDay(iso);
  if (!parts) return "";
  const base = `${parts.day} ${MONTHS[parts.month - 1]}`;
  return parts.year === currentYear ? base : `${base} ${parts.year}`;
};

/** Whole days from `from` to `to` (positive when `to` is later). NaN when either date is invalid. */
export const daysBetween = (from, to) => {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return NaN;
  return toNum(b) - toNum(a);
};

export const statusLabel = (status) => STATUS_LABELS[status] ?? "";

export const priorityLabel = (priority) => PRIORITY_LABELS[priority] ?? "";

/** var(--series-N) for a workstream colour '1'..'4'; muted when unset or unknown. */
export const workstreamColor = (workstream) => {
  const key = String(workstream?.color ?? "");
  return /^[1-4]$/.test(key) ? `var(--series-${key})` : "var(--text-muted)";
};

/**
 * How a due date reads against today. `tone` drives the colour:
 * overdue -> danger, soon (today to 3 days out) -> warning, otherwise muted.
 */
export const dueState = (due, today) => {
  const days = daysBetween(today, due);
  if (Number.isNaN(days)) return { tone: "none", days: NaN };
  if (days < 0) return { tone: "overdue", days };
  if (days <= SOON_DAYS) return { tone: "soon", days };
  return { tone: "later", days };
};
