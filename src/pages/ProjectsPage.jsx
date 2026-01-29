// @maia:projects
import React, { useEffect, useMemo, useState } from "react";
import { uid } from "../lib/ids.js"; // Importing shared uid helper

/* -----------------------------------------
   Helpers
----------------------------------------- */
const withDefaults = (p) => ({
  id: p.id ?? uid(),
  name: p.name ?? "Untitled",
  emoji: p.emoji ?? "📁",
  status: p.status ?? "Active", // Active | Paused | Done
  description: p.description ?? "", // The "Mission"
  createdAt: p.createdAt ?? new Date().toISOString(),
  dueAt: p.dueAt ?? null,
  milestones: p.milestones ?? [], // {id, name, dueAt, status}
  links: p.links ?? [],           // {id, title, url}
  // Preserving other fields to avoid data loss, though might not display all
  decisions: p.decisions ?? [],
});

const normalize = (s) => (s || "").trim().toLowerCase();

// Does note belong to a project (by id or legacy name)?
function noteBelongsToProject(note, project) {
  const ids = note.projectIds || [];
  if (project?.id && ids.includes(project.id)) return true;
  if (note.project && project?.name && normalize(note.project) === normalize(project.name)) {
    return true; // legacy string membership
  }
  return false;
}

/* -----------------------------------------
   Sub-Components
----------------------------------------- */

function ProjectListItem({ project, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors text-sm font-mono ${active
        ? "bg-white/10 text-white border border-white/20"
        : "text-zinc-500 hover:text-white hover:bg-white/10 border border-transparent"
        }`}
    >
      <span className="text-base">{project.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`truncate ${active ? "text-white" : ""}`}>
          {project.name}
        </div>
      </div>
      {project.status !== "Active" && (
        <span className="text-[10px] uppercase text-zinc-600 border border-zinc-800 px-1 rounded">
          {project.status[0]}
        </span>
      )}
    </button>
  );
}

function Section({ title, children, action }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-1">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function Projects({
  notes,
  projects,
  setProjects,
  selectNote,
}) {
  const [activeId, setActiveId] = useState(null);

  // Ensure projects have defaults
  const normalizedProjects = useMemo(() => projects.map(withDefaults), [projects]);

  // Set initial active project
  useEffect(() => {
    if (!activeId && normalizedProjects.length > 0) {
      setActiveId(normalizedProjects[0].id);
    }
  }, [normalizedProjects.length, activeId]);

  const activeProject = useMemo(
    () => normalizedProjects.find((p) => p.id === activeId) || null,
    [normalizedProjects, activeId]
  );

  const scopedNotes = useMemo(() => {
    if (!activeProject) return [];
    return notes.filter((n) => noteBelongsToProject(n, activeProject));
  }, [notes, activeProject]);

  const updateProject = (id, patch) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const createProject = () => {
    const name = prompt("Project Name:");
    if (!name) return;
    const newProj = withDefaults({ name });
    setProjects([...projects, newProj]);
    setActiveId(newProj.id);
  };

  const deleteProject = (id) => {
    if (!confirm("Delete this project? Notes will remain but linkage will be lost.")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) setActiveId(null);
  }

  // Group projects
  const activeList = normalizedProjects.filter(p => p.status === "Active");
  const otherList = normalizedProjects.filter(p => p.status !== "Active");


  return (
    <div className="h-full w-full flex overflow-hidden relative">
      {/* Background: Subtle gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />

      {/* LEFT SIDEBAR: List (Full Height, Glassy) */}
      <div className="w-64 md:w-72 flex-none flex flex-col bg-black/60 border-r border-white/5 backdrop-blur-xl z-20">
        <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-white/5">
          <h1 className="text-xl font-mono text-white font-bold tracking-tight">Opus</h1>
          <button onClick={createProject} className="text-zinc-400 hover:text-white text-xl leading-none transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-white/10">+</button>
        </header>

        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar p-3">
          <div className="space-y-1">
            {activeList.map(p => (
              <ProjectListItem
                key={p.id}
                project={p}
                active={p.id === activeId}
                onClick={() => setActiveId(p.id)}
              />
            ))}
          </div>

          {otherList.length > 0 && (
            <div>
              <div className="px-3 mb-2 text-[10px] text-zinc-600 uppercase tracking-widest mt-4 font-bold">Archived</div>
              <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                {otherList.map(p => (
                  <ProjectListItem
                    key={p.id}
                    project={p}
                    active={p.id === activeId}
                    onClick={() => setActiveId(p.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT CONTENT: Details (Main Area) */}
      <div className="flex-1 min-w-0 flex flex-col bg-transparent relative z-10">
        {!activeProject ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-sm font-mono opacity-50">
            <span className="text-5xl mb-4 grayscale opacity-50">📁</span>
            Select a project to initiate mission.
          </div>
        ) : (
          <div className="w-full h-full flex flex-col overflow-hidden p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Project Header */}
            <div className="flex items-start gap-4">
              <button
                className="text-5xl hover:scale-110 transition-transform cursor-pointer"
                onClick={() => {
                  const e = prompt("Emoji:", activeProject.emoji);
                  if (e) updateProject(activeProject.id, { emoji: e });
                }}
              >
                {activeProject.emoji}
              </button>
              <div className="flex-1">
                <input
                  className="bg-transparent text-3xl font-light text-white outline-none placeholder:text-zinc-700 w-full tracking-tight"
                  value={activeProject.name}
                  onChange={e => updateProject(activeProject.id, { name: e.target.value })}
                  placeholder="Project Name"
                />
                <div className="flex items-center gap-4 mt-2">
                  <select
                    value={activeProject.status}
                    onChange={e => updateProject(activeProject.id, { status: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-400 outline-none hover:bg-white/10 transition-colors"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Done">Done</option>
                  </select>
                  {activeProject.createdAt && (
                    <span className="text-xs text-zinc-600 font-mono">
                      Started {new Date(activeProject.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this project?')) deleteProject(activeProject.id);
                }}
                className="text-zinc-600 hover:text-red-400 transition-colors text-sm"
              >
                Delete
              </button>
            </div>

            {/* Glass Cards Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {/* Strategic Mission Card */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Strategic Mission</div>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-zinc-200 text-sm leading-relaxed outline-none focus:bg-white/10 focus:border-white/20 transition-colors resize-none placeholder:text-zinc-600 min-h-[120px]"
                  value={activeProject.description}
                  onChange={e => updateProject(activeProject.id, { description: e.target.value })}
                  placeholder="Describe the outcome and purpose of this project..."
                />
              </div>

              {/* Linked Notes Card */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    Linked Notes ({linkedNotes.length})
                  </div>
                  <button
                    onClick={() => setShowNotePicker(true)}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    View All
                  </button>
                </div>
                {linkedNotes.length === 0 ? (
                  <div className="px-4 py-6 border border-dashed border-white/5 rounded-xl text-center text-xs text-zinc-600">
                    Use [[note]] key to link notes.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {linkedNotes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => selectNote?.(n.id)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors text-sm text-zinc-300 flex items-center gap-2"
                      >
                        <span className="truncate">{n.title || "Untitled"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources Card */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Resources</div>
                  <button
                    onClick={addLink}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    + Add Link
                  </button>
                </div>
                {(activeProject.links || []).length === 0 ? (
                  <div className="px-4 py-6 border border-dashed border-white/5 rounded-xl text-center text-xs text-zinc-600">
                    No resources yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(activeProject.links || []).map(link => (
                      <div key={link.id} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-zinc-300 hover:text-white underline break-all"
                        >
                          {link.title || link.url}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
