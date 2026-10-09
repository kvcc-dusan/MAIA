import React from "react";
import PropTypes from "prop-types";
import { getPriorityColor } from "@/lib/utils";
import styles from "./FocusTaskItem.module.css";

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
const PRIORITY_LABEL = { p1: "Priority 1", p2: "Priority 2", p3: "Priority 3", high: "High priority", medium: "Medium priority", low: "Low priority" };

export default function FocusTaskItem({ task, onClick }) {
  const priority = task.priority || "p3";

  return (
    <li>
      <button type="button" onClick={onClick} className={styles.row}>
        <span
          className={`${styles.dot} ${task.done ? styles.done : ""}`}
          style={{ backgroundColor: task.done ? "currentColor" : getPriorityColor(priority) }}
          aria-hidden="true"
        />
        {!task.done && <span className="sr-only">{PRIORITY_LABEL[priority] ?? priority}: </span>}
        <span className={`${styles.title} ${task.done ? `line-through ${styles.titleDone}` : ""}`}>
          {task.title}
        </span>
        {task.contextLabel && <span className={styles.context}>{task.contextLabel}</span>}
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
