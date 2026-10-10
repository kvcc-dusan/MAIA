import React from "react";
import ExecutionPanel from "../components/ExecutionPanel";

// Receives { project, selectNote }. The panel owns filters, grouping and rows.
export default function TasksTab({ project }) {
  return <ExecutionPanel project={project} />;
}
