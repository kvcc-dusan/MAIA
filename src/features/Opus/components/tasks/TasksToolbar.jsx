import React from "react";
import { Check, SlidersHorizontal, X } from "@/components/icons";
import { Button } from "@/components/arc/button/button";
import { Menu } from "@/components/composed/Menu";
import { Select } from "@/components/composed/Select";
import { SearchBox } from "../../kit";
import { GROUP_OPTIONS, SORT_OPTIONS, STATUS_FILTERS } from "./filterTasks";
import styles from "./TasksToolbar.module.css";

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": "true" };

/**
 * The whole toolbar in one line: status, workstream and owner dropdowns, the search field and the View menu.
 * Removable chips show filters that only arrive through navigation (an exact status, a milestone).
 */
export function TaskFilters({ filters, dispatch, wsOptions, ownerOptions, showOwners, exactLabel, milestone }) {
  return (
    <div className={styles.row} data-owners={showOwners || undefined}>
      <div className={styles.status}>
        <Select
          label="Status"
          labelClassName="sr-only"
          value={exactLabel ? null : filters.status}
          options={STATUS_FILTERS}
          placeholder={exactLabel ?? "Status"}
          onChange={(value) => dispatch({ type: "status", value })}
        />
      </div>
      <div className={styles.workstream}>
        <Select
          label="Workstream"
          labelClassName="sr-only"
          value={filters.workstreamId || null}
          options={wsOptions}
          clearLabel="All workstreams"
          placeholder="Workstream"
          onChange={(value) => dispatch({ type: "workstream", value })}
        />
      </div>
      {showOwners ? (
        <div className={styles.owner}>
          <Select
            label="Owner"
            labelClassName="sr-only"
            value={filters.owner || null}
            options={ownerOptions}
            clearLabel="Everyone"
            placeholder="Owner"
            onChange={(value) => dispatch({ type: "owner", value })}
          />
        </div>
      ) : null}
      <div className={styles.search}>
        <SearchBox
          label="Search tasks"
          placeholder="Search"
          value={filters.query}
          onValueChange={(value) => dispatch({ type: "query", value })}
        />
      </div>
      <ViewMenu sort={filters.sort} groupBy={filters.groupBy} dispatch={dispatch} />
      {exactLabel ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => dispatch({ type: "status", value: "open" })}
          aria-label={`Remove status filter ${exactLabel}`}
        >
          Status: {exactLabel} <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      ) : null}
      {milestone ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => dispatch({ type: "milestone", value: "" })}
          aria-label={`Remove milestone filter ${milestone.title}`}
        >
          Milestone: {milestone.title} <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

/** Sort and group in one menu, so they take one slot instead of two controls. */
function ViewMenu({ sort, groupBy, dispatch }) {
  const renderOptions = (options, current, type) =>
    options.map((option) => (
      <Menu.Item key={option.value} onClick={() => dispatch({ type, value: option.value })}>
        <Check {...ICON} className={option.value === current ? undefined : styles.hidden} />
        {option.label}
      </Menu.Item>
    ));
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="secondary" />}>
        <SlidersHorizontal {...ICON} />
        View
      </Menu.Trigger>
      <Menu.Content align="end">
        <Menu.Group>
          <Menu.Label>Sort by</Menu.Label>
          {renderOptions(SORT_OPTIONS, sort, "sort")}
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.Label>Group by</Menu.Label>
          {renderOptions(GROUP_OPTIONS, groupBy, "groupBy")}
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}
