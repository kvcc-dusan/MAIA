// Pure helpers for the Record tab's decisions: order, month groups, date text.
// Decision dates are "YYYY-MM-DD" strings (an ISO timestamp is read by its first ten characters).


const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

/** The "YYYY-MM-DD" part of a stored date, or "" when it is missing or not a real calendar day. */
export const dayOf = (value) => {
  const match = DAY_PATTERN.exec(String(value ?? ""));
  if (!match) return "";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return match[0];
};

/** Newest first; undated last; between equal dates the one added later comes first. */
export const sortDecisions = (decisions) =>
  asList(decisions)
    .map((d, index) => ({ d, index, day: dayOf(d.date) }))
    .sort((a, b) => {
      if (a.day !== b.day) {
        if (!a.day) return 1;
        if (!b.day) return -1;
        return b.day.localeCompare(a.day);
      }
      return b.index - a.index;
    })
    .map(({ d }) => d);

export const monthKey = (value) => dayOf(value).slice(0, 7);

/** "October 2026", or "No date" for the undated group. */
export const monthLabel = (key) => {
  const match = /^(\d{4})-(\d{2})$/.exec(key ?? "");
  return match ? `${MONTHS_LONG[Number(match[2]) - 1]} ${match[1]}` : "No date";
};

/** Groups an already sorted list, keeping its order; the undated group stays last. */
export const groupDecisionsByMonth = (sorted) =>
  asList(sorted).reduce((groups, decision) => {
    const key = monthKey(decision.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      return [...groups.slice(0, -1), { ...last, items: [...last.items, decision] }];
    }
    return [...groups, { key, label: monthLabel(key), items: [decision] }];
  }, []);

/** "Oct 14", with the year once it is not the current one ("Oct 14, 2025"). `today` is "YYYY-MM-DD". */
export const formatDecisionDate = (value, today) => {
  const day = dayOf(value);
  if (!day) return "No date";
  const [year, month, date] = day.split("-").map(Number);
  const label = `${MONTHS_SHORT[month - 1]} ${date}`;
  const currentYear = Number(String(today ?? "").slice(0, 4));
  return currentYear && year !== currentYear ? `${label}, ${year}` : label;
};
