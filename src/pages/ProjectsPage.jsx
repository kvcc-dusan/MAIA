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
      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors ${active
          ? "bg-zinc-900 text-zinc-100 border border-zinc-800"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 border border-transparent"
        }`}
    >
      <span className="text-base">{project.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${active ? "text-zinc-200" : ""}`}>
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
    <div className="h-full flex flex-col md:flex-row max-w-7xl mx-auto w-full">
      {/* LEFT SIDEBAR: List */}
      <div className="w-full md:w-64 flex-none border-r border-zinc-900 bg-black/40 flex flex-col">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Portfolio</span>
          <button onClick={createProject} className="text-zinc-400 hover:text-white text-lg leading-none">+</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-6">
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
              <div className="px-3 mb-2 text-[10px] text-zinc-600 uppercase tracking-widest">Paused / Done</div>
              <div className="space-y-1">
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

      {/* RIGHT CONTENT: Details */}
      <div className="flex-1 min-w-0 bg-black flex flex-col">
        {!activeProject ? (
          <div className="flex-1 grid place-items-center text-zinc-600 text-sm font-mono">
            Select or create a project.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* HERO Header */}
            <div className="px-8 py-8 border-b border-zinc-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <button
                    className="text-4xl hover:bg-zinc-900 rounded p-1 transition-colors"
                    onClick={() => {
                      const e = prompt("Emoji:", activeProject.emoji);
                      if (e) updateProject(activeProject.id, { emoji: e });
                    }}
                  >
                    {activeProject.emoji}
                  </button>
                  <div>
                    <input
                      className="bg-transparent text-2xl font-bold text-zinc-100 outline-none placeholder:text-zinc-700 w-full"
                      value={activeProject.name}
                      onChange={e => updateProject(activeProject.id, { name: e.target.value })}
                      placeholder="Project Name"
                    />
                    <div className="flex items-center gap-4 mt-2">
                      <select
                        className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 rounded px-2 py-1 outline-none"
                        value={activeProject.status}
                        onChange={e => updateProject(activeProject.id, { status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Paused">Paused</option>
                        <option value="Done">Done</option>
                      </select>
                      <div className="text-xs text-zinc-600 font-mono">
                        Created {new Date(activeProject.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteProject(activeProject.id)}
                  className="text-zinc-600 hover:text-red-500 text-xs px-3 py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="px-8 py-8 max-w-4xl">
              {/* MISSION */}
              <Section title="Strategic Mission">
                <textarea
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 text-zinc-300 text-sm leading-relaxed outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800/50 min-h-[120px]"
                  placeholder="What is the outcome? Why does this matter?"
                  value={activeProject.description}
                  onChange={e => updateProject(activeProject.id, { description: e.target.value })}
                />
              </Section>

              {/* NOTES */}
              <Section title={`Linked Notes (${scopedNotes.length})`}
                action={
                  <button className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-wider">
                    {/* Potential 'Add Note' future action */}
                  </button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scopedNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => selectNote(n.id)}
                      className="text-left group p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/20 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all"
                    >
                      <div className="text-sm text-zinc-300 group-hover:text-white font-medium truncate mb-1">
                        {n.title || "Untitled"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                        {n.tags && n.tags.length > 0 && (
                          <span className="text-[10px] text-zinc-600">
                            #{n.tags[0]}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {scopedNotes.length === 0 && (
                    <div className="col-span-full py-4 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-600 text-sm">
                      No notes linked yet. Tag notes with <code>[[{activeProject.name}]]</code> or assign project in Editor.
                    </div>
                  )}
                </div>
              </Section>

              {/* LINKS & RESOURCES */}
              <Section title="Resources">
                <div className="space-y-2">
                  {activeProject.links.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-2 rounded bg-zinc-950/40 border border-zinc-800/50">
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-blue-400 text-sm truncate flex-1 mr-4">
                        {l.title} <span className="text-zinc-600 text-xs ml-2">{l.url}</span>
                      </a>
                      <button
                        onClick={() => updateProject(activeProject.id, { links: activeProject.links.filter(x => x.id !== l.id) })}
                        className="text-zinc-600 hover:text-zinc-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {/* Simple Add Link */}
                  <button
                    onClick={() => {
                      const title = prompt("Link Title:");
                      if (!title) return;
                      const url = prompt("URL:");
                      if (!url) return;
                      updateProject(activeProject.id, { links: [...activeProject.links, { id: uid(), title, url }] });
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-2"
                  >
                    + Add Resource
                  </button>
                </div>
              </Section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
