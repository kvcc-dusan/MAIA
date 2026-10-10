import React from "react";
import { useData } from "@/context/DataContext";
import ResourcesPanel from "../components/ResourcesPanel";
import KnowledgePanel from "../components/KnowledgePanel";
import AssetsPanel from "../components/AssetsPanel";
import styles from "./LibraryTab.module.css";

// Links and notes side by side from 1024px, assets full width below; one column under that.
export default function LibraryTab({ project, selectNote }) {
  const { updateProject } = useData();
  return (
    <div className={styles.grid}>
      <ResourcesPanel project={project} updateProject={updateProject} />
      <KnowledgePanel project={project} selectNote={selectNote} />
      <div className={styles.wide}>
        <AssetsPanel project={project} />
      </div>
    </div>
  );
}
