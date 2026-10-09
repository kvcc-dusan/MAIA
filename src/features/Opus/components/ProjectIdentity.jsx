import React from 'react';
import { Flag } from "lucide-react";
import { Badge } from "@/components/arc/badge/badge";
import { useData } from "../../../context/DataContext";
import ProjectVitality from "./ProjectVitality";
import ActivitySummary from "./ActivitySummary";
import { nextMilestone, formatMilestoneDate } from "../milestones";
import styles from "./ProjectIdentity.module.css";

const MILESTONE_TITLE_MAX = 32;

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const pluralize = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/**
 * The project header: the editable name, then everything else as one quiet
 * meta line. The name is a heading (the shell owns the page h1) wrapping an
 * input, so it stays editable in place and still outlines the page.
 */
export default function ProjectIdentity({ project, updateProject }) {
  const { tasks, sessions } = useData();

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.done).length;
  const sessionCount = sessions.filter(s => s.linkedProjectId === project.id).length;
  const upcoming = nextMilestone(project);

  return (
    <div className={styles.root}>
      <h2 className={styles.heading}>
        <input
          value={project.name}
          onChange={e => updateProject(project.id, { name: e.target.value })}
          aria-label="Project name"
          className={styles.name}
          placeholder="Project name"
        />
      </h2>

      <div className={styles.meta}>
        <ProjectVitality project={project} />
        <ActivitySummary project={project} />
        <span>{completedTasks}/{projectTasks.length} tasks</span>
        <span>{pluralize(sessionCount, "session", "sessions")}</span>
        {project.createdAt && (
          <span className={styles.muted}>
            Since {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </span>
        )}
        {upcoming && (
          <Badge
            tone="neutral"
            icon={<Flag size={12} strokeWidth={1.75} />}
            title={`Next milestone: ${upcoming.title}`}
          >
            {`${truncate(upcoming.title, MILESTONE_TITLE_MAX)}, ${formatMilestoneDate(upcoming.date)}`}
          </Badge>
        )}
      </div>
    </div>
  );
}
