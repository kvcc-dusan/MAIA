import React from "react";
import PropTypes from "prop-types";

export default function FocusTaskItem({ task }) {
  return (
    <li className="flex items-center gap-2 text-sm text-card-foreground">
      <span
        className={`w-1.5 h-1.5 rounded-full ${task.done ? "bg-muted-foreground" : "bg-primary"
          }`}
      />
      <span className={task.done ? "line-through text-muted-foreground" : ""}>
        {task.title}
      </span>
    </li>
  );
}

FocusTaskItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string.isRequired,
    done: PropTypes.bool,
  }).isRequired,
};
