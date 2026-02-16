import React from "react";
import PropTypes from "prop-types";

const NEON_BLUE = '#0044FF';
const NEON_ORANGE = '#FF5930';
const NEON_GREEN = '#ABFA54';

export default function FocusTaskItem({ task, onClick }) {
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
    <li
      onClick={onClick}
      className="flex items-center gap-3 text-sm text-card-foreground hover:text-white/50 font-mono font-medium cursor-pointer rounded px-2 py-1 transition-colors -mx-2"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity"
        style={{
          backgroundColor: task.done ? 'currentColor' : dotColor,
          opacity: task.done ? 0.5 : 1,
          boxShadow: task.done ? 'none' : `0 0 4px ${dotColor}`
        }}
      />
      <div className="flex flex-col min-w-0">
        <span className={`truncate ${task.done ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </span>
      </div>
    </li>
  );
}

FocusTaskItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string.isRequired,
    done: PropTypes.bool,
  }).isRequired,
  onClick: PropTypes.func,
};
