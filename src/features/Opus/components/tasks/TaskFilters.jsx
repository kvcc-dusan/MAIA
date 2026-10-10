import React from "react";
import { Button } from "@/components/arc/button/button";
import ChipGroup from "@/components/arc/chip-group/chip-group";
import FilterToolbar from "@/components/arc/filter-toolbar/filter-toolbar";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { SearchField } from "@/components/arc/search-field/search-field";
import { Select } from "@/components/composed/Select";
import { GROUP_OPTIONS, STATUS_FILTERS, UNASSIGNED, activeFilterChips, hasActiveFilters } from "./filterTasks";
import { workstreamColor } from "./taskDisplay";
import styles from "./TaskFilters.module.css";

const sortedByDate = (milestones) =>
  [...milestones].sort((a, b) => String(a.date ?? "9").localeCompare(String(b.date ?? "9")));

/** Status chips, search, workstream and milestone selects, active-filter chips, grouping. */
export default function TaskFilters({
  filters, dispatch, workstreams, milestones, shownCount, totalCount, completedCount, onClearCompleted,
}) {
  const chips = activeFilterChips(filters, { workstreams, milestones });
  const wsOptions = [
    ...workstreams.map((w) => ({ value: w.id, label: w.name, color: workstreamColor(w) })),
    { value: UNASSIGNED, label: "No workstream" },
  ];
  const msOptions = [
    ...sortedByDate(milestones).map((m) => ({ value: m.id, label: m.title })),
    { value: UNASSIGNED, label: "No milestone" },
  ];
  const countText = hasActiveFilters(filters)
    ? `${shownCount} of ${totalCount} ${totalCount === 1 ? "task" : "tasks"}`
    : `${totalCount} ${totalCount === 1 ? "task" : "tasks"}`;

  return (
    <div className={styles.filters} role="group" aria-label="Filter and group tasks">
      <div className={styles.status}>
        <span className={styles.label}>Status</span>
        <ChipGroup
          label="Status"
          options={STATUS_FILTERS}
          value={filters.statuses}
          onValueChange={(value) => dispatch({ type: "statuses", value })}
        />
      </div>

      <div className={styles.fields}>
        <SearchField
          label="Search"
          placeholder="Search title or notes"
          value={filters.query}
          onValueChange={(value) => dispatch({ type: "query", value })}
        />
        {workstreams.length > 0 && (
          <Select
            label="Workstream"
            value={filters.workstreamId || null}
            options={wsOptions}
            clearLabel="All workstreams"
            placeholder="All workstreams"
            onChange={(value) => dispatch({ type: "workstream", value })}
          />
        )}
        {milestones.length > 0 && (
          <Select
            label="Milestone"
            value={filters.milestoneId || null}
            options={msOptions}
            clearLabel="All milestones"
            placeholder="All milestones"
            onChange={(value) => dispatch({ type: "milestone", value })}
          />
        )}
      </div>

      {chips.length > 0 && (
        <FilterToolbar
          filters={chips}
          onRemove={(id) => dispatch({ type: "remove", id })}
          onClearAll={() => dispatch({ type: "clear" })}
        />
      )}

      <div className={styles.bar}>
        <div className={styles.group}>
          <span className={styles.label}>Group by</span>
          <SegmentedControl
            label="Group tasks by"
            options={GROUP_OPTIONS}
            value={filters.groupBy}
            onValueChange={(value) => dispatch({ type: "groupBy", value })}
          />
        </div>
        <div className={styles.count}>
          <p role="status" className={styles.countText}>{countText}</p>
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>Clear completed</Button>
          )}
        </div>
      </div>
    </div>
  );
}
