import React from "react";
import { useData } from "@/context/DataContext";
import ResourcesPanel from "../components/ResourcesPanel";
import AssetsPanel from "../components/AssetsPanel";
import styles from "./ResourcesTab.module.css";

// Links and assets, stacked full width. Notes live in the Notes tab.
export default function ResourcesTab({ project }) {
  const { updateProject } = useData();
  return (
    <div className={styles.grid}>
      <ResourcesPanel project={project} updateProject={updateProject} />
      <AssetsPanel project={project} />
    </div>
  );
}
