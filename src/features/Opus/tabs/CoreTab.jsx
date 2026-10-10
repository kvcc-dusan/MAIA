import React from "react";
import { useData } from "@/context/DataContext";
import ProjectBrief from "../components/ProjectBrief";
import LibraryTab from "./LibraryTab";
import styles from "./StubTab.module.css";

// Everything MAIA-native that the hub has no page for: brief, criteria, links, notes, assets.
export default function CoreTab({ project, selectNote }) {
  const { updateProject } = useData();
  return (
    <div className={styles.page}>
      <ProjectBrief project={project} updateProject={updateProject} />
      <LibraryTab project={project} selectNote={selectNote} />
    </div>
  );
}
