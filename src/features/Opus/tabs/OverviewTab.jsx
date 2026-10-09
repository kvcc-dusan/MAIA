import React from "react";
import { useData } from "@/context/DataContext";
import ProjectBrief from "../components/ProjectBrief";

// Temporary: the existing brief until the Overview tab replaces it.
// Receives { project, selectNote }.
export default function OverviewTab({ project }) {
  const { updateProject } = useData();
  return <ProjectBrief project={project} updateProject={updateProject} />;
}
