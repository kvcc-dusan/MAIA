import React from "react";
import ExecutionPanel from "../components/ExecutionPanel";

// Temporary: the existing task list until the Tasks tab extends it.
// Receives { project, selectNote }.
export default function TasksTab({ project }) {
  return <ExecutionPanel project={project} />;
}
