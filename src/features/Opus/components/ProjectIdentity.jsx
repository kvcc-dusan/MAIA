import React from "react";
import { Pencil } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { Badge } from "@/components/arc/badge/badge";
import Progress from "@/components/arc/progress/progress";
import { useData } from "../../../context/DataContext";
import styles from "./ProjectIdentity.module.css";

/**
 * The compact hub header, shown on every tab: phase badge, the editable name,
 * the one-line headline, then a quiet "N of M tasks done" line with progress.
 * The name is a heading (the shell owns the page h1) wrapping an input, so it
 * stays editable in place and still outlines the page. Overview renders the
 * hub's full header block itself.
 */
export default function ProjectIdentity({ project, updateProject, onEdit, showProgress = true }) {
  const { tasks } = useData();

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const doneCount = projectTasks.filter((t) => t.status === "done" || t.done).length;
  const headline = typeof project.headline === "string" ? project.headline.trim() : "";
  const phase = typeof project.phase === "string" ? project.phase.trim() : "";

  return (
    <div className={styles.root}>
      {phase ? (
        <div className={styles.phase}>
          <Badge tone="info" size="sm">{phase}</Badge>
        </div>
      ) : null}
      <div className={styles.nameRow}>
        <h2 className={styles.heading}>
          <input
            value={project.name}
            onChange={(e) => updateProject(project.id, { name: e.target.value })}
            aria-label="Project name"
            className={styles.name}
            placeholder="Project name"
          />
        </h2>
        {onEdit ? <IconButton label="Edit project" icon={Pencil} onClick={onEdit} /> : null}
      </div>
      {headline ? <p className={styles.headline}>{headline}</p> : null}
      {showProgress ? (
        <div className={styles.meta}>
          <span>{doneCount} of {projectTasks.length} tasks done</span>
          <Progress className={styles.progress} value={doneCount} max={Math.max(projectTasks.length, 1)} />
        </div>
      ) : null}
    </div>
  );
}
