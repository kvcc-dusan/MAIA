import React from "react";
import PropTypes from "prop-types";
import { getPriorityColor } from "@/lib/utils";

/**
 * A row in the Focus widget.
 *
 * Was an `<li onClick>` with no role, tabIndex or key handler, which made the
 * widget's primary action mouse-only; it carries a real button now.
 *
 * `contextLabel` ("Portals 2.0" / "Inbox") has been computed for every task in
 * HomePage since the widget was written and was never displayed — without it
 * the list is a column of bare titles with no hint which project they belong to.
 */
export default function FocusTaskItem({ task, onClick }) {
  const dotColor = getPriorityColor(task.priority || 'p3');

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group -mx-2 flex w-full items-center gap-3 rounded px-2 py-1 text-left text-sm font-medium text-card-foreground transition-colors hover:bg-overlay-subtle"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity"
          style={{
            backgroundColor: task.done ? 'currentColor' : dotColor,
            opacity: task.done ? 0.5 : 1,
            boxShadow: task.done ? 'none' : `0 0 4px ${dotColor}`
          }}
        />
        <span className={`min-w-0 flex-1 truncate ${task.done ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </span>
        {task.contextLabel && (
          <span className="shrink-0 truncate text-xs text-subtle-foreground max-w-[8rem]">
            {task.contextLabel}
          </span>
        )}
      </button>
    </li>
  );
}

FocusTaskItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string.isRequired,
    done: PropTypes.bool,
    contextLabel: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
};
