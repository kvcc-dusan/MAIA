/**
 * Opus kit: the shared pieces every hub page is built from. Pick by element.
 *
 *   PageBar        toolbar row on every tab: filters/search left, ONE primary action right
 *   FilterChips    status/workstream/owner chip rows (Board, Tasks, Questions, Documents)
 *   SearchBox      search in the toolbar (Tasks, Decisions, Documents)
 *   MetricTile     Overview tiles and Weekly report tiles (value, "/60" unit, context, link)
 *   GroupCard      Tasks group card, Decisions month card, Overview workstream card
 *   ListRow        Tasks row, Questions row, Documents row, Needs attention row
 *   StatusBadge    todo/doing/blocked/done, open/answered, draft/current/..., planned/active/atRisk
 *   OwnerAvatar    owner initials (pass showName for list rows, omit for Board cards)
 *   DueLabel       due date: "Overdue 8 Oct" danger, within 3 days warning, else muted
 *   WorkstreamTag  colour dot + workstream name (Board card, Tasks subtitle, Needs attention)
 *   PriorityBadge  High / Medium badge for p1 / p2 (nothing for p3)
 *   SizeMark       S/M/L circle on Board cards
 *
 * Pure helpers (format.js): initials, humanDate, daysBetween, dueState,
 * statusLabel, priorityLabel, workstreamColor.
 */
export { default as PageBar } from "./PageBar";
export { default as FilterChips } from "./FilterChips";
export { default as SearchBox } from "./SearchBox";
export { default as MetricTile } from "./MetricTile";
export { default as GroupCard } from "./GroupCard";
export { default as ListRow } from "./ListRow";
export { default as StatusBadge } from "./StatusBadge";
export { default as OwnerAvatar } from "./OwnerAvatar";
export { default as DueLabel } from "./DueLabel";
export { default as WorkstreamTag } from "./WorkstreamTag";
export { default as PriorityBadge } from "./PriorityBadge";
export { default as SizeMark } from "./SizeMark";
export * from "./format";
