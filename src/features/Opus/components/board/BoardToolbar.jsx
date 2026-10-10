import React from "react";
import { Button } from "@/components/arc/button/button";
import { ChipGroup } from "@/components/arc/chip-group/chip-group";
import { SearchField } from "@/components/arc/search-field/search-field";
import { ALL_WORKSTREAMS, nextWorkstreamSelection, selectionToChips } from "./model";
import styles from "./BoardToolbar.module.css";

export default function BoardToolbar({ workstreams, selected, onSelectedChange, query, onQueryChange, shown, total, onClear }) {
  const isFiltered = selected.length > 0 || query.trim() !== "";
  const options = [{ value: ALL_WORKSTREAMS, label: "All workstreams" }, ...workstreams.map((w) => ({ value: w.id, label: w.name }))];
  const noun = total === 1 ? "task" : "tasks";

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        {workstreams.length > 0 && (
          <div className={styles.chips}>
            <ChipGroup
              label="Filter by workstream"
              options={options}
              value={selectionToChips(selected)}
              onValueChange={(next) => onSelectedChange(nextWorkstreamSelection(selected, next))}
            />
          </div>
        )}
        <div className={styles.search}>
          <SearchField label="Search tasks" value={query} onValueChange={onQueryChange} placeholder="Title or description" />
        </div>
      </div>
      <p className={styles.summary} role="status">
        <span className={styles.count}>{isFiltered ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`}</span>
        {isFiltered && <Button variant="ghost" size="sm" onClick={onClear}>Clear filters</Button>}
      </p>
    </div>
  );
}
