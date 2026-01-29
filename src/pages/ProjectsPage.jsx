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


  <div className="h-full w-full flex items-center justify-center p-4 md:p-8">
    {/* Main Container */}
    <div className="glass-panel w-full max-w-7xl h-full max-h-[90vh] rounded-3xl flex overflow-hidden shadow-2xl relative">

      {/* LEFT SIDEBAR: List (Darker Context) */}
      <div className="w-64 md:w-72 flex-none flex flex-col bg-black/40 border-r border-white/5">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-white/5">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Opus</span>
          <button onClick={createProject} className="text-zinc-400 hover:text-white text-xl leading-none transition-colors opacity-50 hover:opacity-100 flex items-center justify-center w-6 h-6 rounded hover:bg-white/10">+</button>
        </div>

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
      <div className="flex-1 min-w-0 flex flex-col bg-transparent relative">
        {!activeProject ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-sm font-mono opacity-50">
            <span className="text-4xl mb-4 grayscale opacity-50">📁</span>
            Select a project to initiate mission.
          </div>
        ) : (
          <div className="w-full h-full flex flex-col overflow-hidden relative animate-in fade-in duration-300">
            {/* Decorative top fade */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-0" />

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
              {/* HERO Header */}
              <div className="px-8 pt-10 pb-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-5">
                    <button
                      className="text-5xl hover:scale-110 transition-transform cursor-pointer"
                      onClick={() => {
                        const e = prompt("Emoji:", activeProject.emoji);
                        if (e) updateProject(activeProject.id, { emoji: e });
                      }}
                    >
                      {activeProject.emoji}
                    </button>
                    <div className="pt-1">
                      <input
                        className="bg-transparent text-3xl font-light text-white outline-none placeholder:text-zinc-700 w-full tracking-tight"
                        value={activeProject.name}
                        onChange={e => updateProject(activeProject.id, { name: e.target.value })}
                        placeholder="Project Name"
                      />
                      <div className="flex items-center gap-4 mt-3">
                        <select
                          className="bg-white/5 border border-white/10 text-xs text-zinc-400 rounded-full px-3 py-1 outline-none hover:bg-white/10 transition-colors cursor-pointer appearance-none"
                          value={activeProject.status}
                          onChange={e => updateProject(activeProject.id, { status: e.target.value })}
                        >
                          <option value="Active">Active</option>
                          <option value="Paused">Paused</option>
                          <option value="Done">Done</option>
                        </select>
                        <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-wide">
                          Started {new Date(activeProject.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProject(activeProject.id)}
                    className="text-zinc-600 hover:text-red-400 text-xs px-3 py-1.5 border border-transparent hover:border-red-900/30 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="px-8 pb-12 max-w-5xl space-y-10">
                {/* MISSION */}
                <Section title="Strategic Mission">
                  <textarea
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-5 text-zinc-300 text-sm leading-relaxed outline-none focus:bg-white/10 focus:border-white/10 transition-colors min-h-[140px] resize-none font-sans"
                    placeholder="Describe the outcome and purpose of this project..."
                    value={activeProject.description}
                    onChange={e => updateProject(activeProject.id, { description: e.target.value })}
                  />
                </Section>

                {/* NOTES */}
                <Section title={`Linked Notes (${scopedNotes.length})`}
                  action={
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-wider transition-colors font-bold">
                      View All
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scopedNotes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => selectNote(n.id)}
                        className="text-left group p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-200 flex flex-col gap-2 shadow-sm"
                      >
                        <div className="text-sm text-zinc-200 font-medium truncate w-full group-hover:text-white transition-colors">
                          {n.title || "Untitled"}
                        </div>
                        <div className="flex items-center gap-2 justify-between w-full">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {n.tags && n.tags.length > 0 && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              #{n.tags[0]}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {scopedNotes.length === 0 && (
                      <div className="col-span-full py-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs">
                        Use <code>[[{activeProject.name}]]</code> key to link notes.
                      </div>
                    )}
                  </div>
                </Section>

                {/* RESOURCES */}
                <Section title="Resources">
                  <div className="flex flex-wrap gap-2">
                    {activeProject.links.map(l => (
                      <div key={l.id} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/5 border border-white/5 group hover:border-zinc-700 transition-colors">
                        <a href={l.url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-blue-400 text-xs truncate max-w-[200px] transition-colors">
                          {l.title}
                        </a>
                        <button
                          onClick={() => updateProject(activeProject.id, { links: activeProject.links.filter(x => x.id !== l.id) })}
                          className="text-zinc-600 hover:text-red-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const title = prompt("Link Title:");
                        if (!title) return;
                        const url = prompt("URL:");
                        if (!url) return;
                        updateProject(activeProject.id, { links: [...activeProject.links, { id: uid(), title, url }] });
                      }}
                      className="px-3 py-1.5 rounded-full border border-dashed border-zinc-700 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                    >
                      + Add Link
                    </button>
                  </div>
                </Section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
