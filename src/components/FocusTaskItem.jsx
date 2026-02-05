import React from "react";
import PropTypes from "prop-types";

const NEON_BLUE = '#0044FF';
const NEON_ORANGE = '#FF5930';
const NEON_GREEN = '#ABFA54';

export default function FocusTaskItem({ task }) {
  const getPriorityColor = (p) => {
    switch (p) {
      case 'high': case 'p1': return NEON_BLUE;
      case 'medium': case 'p2': return NEON_ORANGE;
      case 'low': case 'p3': return NEON_GREEN;
      default: return NEON_GREEN;
    }
  };

  const dotColor = getPriorityColor(task.priority || 'p3');

  return (
    <li className="flex items-center gap-2 text-sm text-card-foreground font-medium">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: task.done ? 'currentColor' : dotColor,
          opacity: task.done ? 0.5 : 1,
          boxShadow: task.done ? 'none' : `0 0 4px ${dotColor}`
        }}
      />
      <span className={`truncate ${task.done ? "line-through text-muted-foreground" : ""}`}>
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
