/**
 * Milestone helpers, kept out of MilestonesList.jsx because react-refresh
 * requires component files to export only components.
 */

/** Sorts undated milestones last; dated ones ascend by date. */
export const byDate = (a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
};

export const formatMilestoneDate = (date) =>
    new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** The next milestone still ahead, or null. Drives the header chip. */
export const nextMilestone = (project) =>
    (project.milestones || [])
        .filter(m => !m.done && m.date)
        .sort(byDate)[0] || null;
