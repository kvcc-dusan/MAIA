import React from 'react';
import ProjectVitality from "./ProjectVitality";
import ActivitySummary from "./ActivitySummary";

export default function ProjectIdentity({ project, updateProject }) {
  return (
    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Row 1 — Status + momentum */}
      <div className="flex items-center gap-3">
        <ProjectVitality project={project} />
        <ActivitySummary project={project} />
      </div>

      {/* Row 2 — Title, flush left */}
      <input
        value={project.name}
        onChange={e => updateProject(project.id, { name: e.target.value })}
        className="bg-transparent font-bold font-sans text-white w-full outline-none placeholder:text-zinc-700 leading-none"
        style={{ fontSize: 'clamp(2.2rem, 3.5vw, 2.75rem)', letterSpacing: '-0.02em' }}
        placeholder="Project Name"
      />
    </div>
  );
}
