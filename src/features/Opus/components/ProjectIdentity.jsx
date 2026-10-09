import React from 'react';
import { useData } from "../../../context/DataContext";
import { Flag02 as Flag } from "../../../components/ui/CustomIcon.jsx";
import ProjectVitality from "./ProjectVitality";
import ActivitySummary from "./ActivitySummary";
import { nextMilestone, formatMilestoneDate } from "../milestones";

/**
 * The project header: title first, everything else as one quiet meta line.
 *
 * Vitality and activity used to occupy their own row above the title, which
 * gave the top of the page to two read-only computed badges. They now sit
 * under the title with the counts that were previously buried at the bottom of
 * the collapsed context accordion.
 */
export default function ProjectIdentity({ project, updateProject }) {
  const { tasks, sessions } = useData();

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.done).length;
  const sessionCount = sessions.filter(s => s.linkedProjectId === project.id).length;
  const upcoming = nextMilestone(project);

  return (
    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <input
        value={project.name}
        onChange={e => updateProject(project.id, { name: e.target.value })}
        aria-label="Project name"
        className="bg-transparent font-bold font-sans text-foreground w-full outline-hidden placeholder:text-faint-foreground leading-none"
        style={{ fontSize: 'clamp(2.2rem, 3.5vw, 2.75rem)', letterSpacing: '-0.02em' }}
        placeholder="Project Name"
      />

      <div className="flex items-center gap-3 flex-wrap text-xs text-subtle-foreground">
        <ProjectVitality project={project} />
        <ActivitySummary project={project} />
        <span className="text-faint-foreground">·</span>
        <span>{completedTasks}/{projectTasks.length} tasks</span>
        <span>{sessionCount} sessions</span>
        {project.createdAt && (
          <span className="text-faint-foreground">
            since {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </span>
        )}
        {upcoming && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-overlay-subtle border border-border-subtle text-muted-foreground">
            <Flag size={10} className="text-faint-foreground" />
            <span className="truncate max-w-[180px]">{upcoming.title}</span>
            <span className="text-faint-foreground">{formatMilestoneDate(upcoming.date)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
