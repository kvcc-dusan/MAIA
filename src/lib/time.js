
export const toLocalInputValue = (date) => {
    const pad = (n) => (n < 10 ? "0" + n : n);
    return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes())
    );
};

export const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();

export const isPastTime = (date) => {
    return new Date(date) < new Date();
};

export const checkOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();
    return s1 < e2 && s2 < e1;
};

export const hasOverlap = (start, end, sessions, excludeSessionId = null) => {
    return sessions.some(s => {
        if (excludeSessionId && s.id === excludeSessionId) return false;
        return checkOverlap(start, end, s.start, s.end);
    });
};

/* -------------------------------------------
   Shared date/time formatting.

   Every Chronos surface printed dates with its own ad-hoc toLocale* call —
   mixed locales, mixed hour styles ('numeric' in one place, '2-digit' in its
   sibling) and a hand-built hour gutter label. These cached Intl formatters
   are the one voice; constructing Intl instances per render is also the most
   expensive way to print a date.
------------------------------------------- */
const fmt = (options) => new Intl.DateTimeFormat("en-US", options);

const TIME_FMT = fmt({ hour: "numeric", minute: "2-digit" });
const DAY_FMT = fmt({ weekday: "long", month: "short", day: "numeric" });
const MONTH_YEAR_FMT = fmt({ month: "long", year: "numeric" });
const MONTH_DAY_FMT = fmt({ month: "short", day: "numeric" });
const FULL_DATE_FMT = fmt({ weekday: "long", month: "long", day: "numeric" });
const HOUR_FMT = fmt({ hour: "numeric", minute: "2-digit" });

/** "10:49 PM" */
export const formatTime = (date) => TIME_FMT.format(new Date(date));
/** "Friday, Sep 18" */
export const formatDayLabel = (date) => DAY_FMT.format(new Date(date));
/** "September 2026" */
export const formatMonthYear = (date) => MONTH_YEAR_FMT.format(new Date(date));
/** "Sep 18" */
export const formatMonthDay = (date) => MONTH_DAY_FMT.format(new Date(date));
/** "Friday, September 18" */
export const formatFullDate = (date) => FULL_DATE_FMT.format(new Date(date));
/** Hour-of-day number (0–23) → "8:00 AM", for timeline gutters. */
export const formatHourLabel = (hour) => HOUR_FMT.format(new Date(2000, 0, 1, hour));
