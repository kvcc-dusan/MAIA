import React from "react";
import { useData } from "@/context/DataContext";
import MilestonesList from "../components/MilestonesList";

// Temporary: the milestone editor until the Roadmap tab replaces it.
// Receives { project, selectNote }.
export default function RoadmapTab({ project }) {
  const { updateProject } = useData();
  return <MilestonesList project={project} updateProject={updateProject} />;
}
