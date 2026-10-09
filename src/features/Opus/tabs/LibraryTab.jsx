import React from "react";
import { useData } from "@/context/DataContext";
import ResourcesPanel from "../components/ResourcesPanel";
import KnowledgePanel from "../components/KnowledgePanel";
import AssetsPanel from "../components/AssetsPanel";
import styles from "./LibraryTab.module.css";

// Temporary: the existing library panels in a simple grid until the Library
// tab replaces them. Receives { project, selectNote }.
export default function LibraryTab({ project, selectNote }) {
  const { updateProject } = useData();
  return (
    <div className={styles.grid}>
      <ResourcesPanel project={project} updateProject={updateProject} />
      <KnowledgePanel project={project} selectNote={selectNote} />
      <AssetsPanel project={project} />
    </div>
  );
}
