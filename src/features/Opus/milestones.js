/**
 * Milestone helpers, kept out of component files because react-refresh
 * requires component files to export only components.
 */

const dayPart = (date) => String(date).slice(0, 10);

/** Sorts undated milestones last; dated ones ascend by calendar day. */
export const byDate = (a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return dayPart(a.date).localeCompare(dayPart(b.date));
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Reads the calendar day out of the string so a date-only value never shifts a
// day in time zones west of UTC.
export const formatMilestoneDate = (date) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date));
    if (!match) return "";
    return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`;
};

/** The next milestone still ahead, or null. Drives the header chip. */
export const nextMilestone = (project) =>
    (project.milestones || [])
        .filter(m => m.status !== 'done' && m.date)
        .sort(byDate)[0] || null;
