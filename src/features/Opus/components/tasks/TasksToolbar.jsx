import React, { useEffect, useRef, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "@/components/icons";
import { Button } from "@/components/arc/button/button";
import { IconButton } from "@/components/composed/IconButton";
import { Menu } from "@/components/composed/Menu";
import { Select } from "@/components/composed/Select";
import { SearchBox } from "../../kit";
import { GROUP_OPTIONS, SORT_OPTIONS, STATUS_FILTERS } from "./filterTasks";
import styles from "./TasksToolbar.module.css";

const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": "true" };

/** A search that stays an icon until it is needed, and collapses again when it is empty. */
function ExpandingSearch({ value, onValueChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const expanded = open || Boolean(value);

  useEffect(() => {
    if (open) wrapRef.current?.querySelector("input")?.focus();
  }, [open]);

  if (!expanded) {
    return <IconButton label="Search tasks" icon={Search} variant="secondary" onClick={() => setOpen(true)} />;
  }
  return (
    <div
      ref={wrapRef}
      className={styles.search}
      onBlur={(event) => {
        if (!value && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        onValueChange("");
        setOpen(false);
      }}
    >
      <SearchBox label="Search tasks" placeholder="Search tasks" value={value} onValueChange={onValueChange} />
    </div>
  );
}

/** Sort and group in one menu, so they take one slot in the bar instead of two controls. */
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
      <Menu.Content align="start">
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

/**
 * Everything the Tasks tab filters, in one row: status, workstream and owner dropdowns,
 * a search that stays an icon until needed, and a View menu for sort and grouping.
 * Removable chips show filters that only arrive through navigation (an exact status, a milestone).
 */
export default function TasksToolbar({ filters, dispatch, wsOptions, ownerOptions, showOwners, exactLabel, milestone }) {
  return (
    <>
      <div className={styles.row}>
        <div className={styles.field}>
          <Select
            label="Status"
            labelClassName="sr-only"
            value={exactLabel ? null : filters.status}
            options={STATUS_FILTERS}
            placeholder={exactLabel ?? "Status"}
            onChange={(value) => dispatch({ type: "status", value })}
          />
        </div>
        <div className={styles.field}>
          <Select
            label="Workstream"
            labelClassName="sr-only"
            value={filters.workstreamId || null}
            options={wsOptions}
            clearLabel="All workstreams"
            placeholder="All workstreams"
            onChange={(value) => dispatch({ type: "workstream", value })}
          />
        </div>
        {showOwners ? (
          <div className={styles.field}>
            <Select
              label="Owner"
              labelClassName="sr-only"
              value={filters.owner || null}
              options={ownerOptions}
              clearLabel="Everyone"
              placeholder="Everyone"
              onChange={(value) => dispatch({ type: "owner", value })}
            />
          </div>
        ) : null}
        <ExpandingSearch value={filters.query} onValueChange={(value) => dispatch({ type: "query", value })} />
        <ViewMenu sort={filters.sort} groupBy={filters.groupBy} dispatch={dispatch} />
      </div>
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
    </>
  );
}
