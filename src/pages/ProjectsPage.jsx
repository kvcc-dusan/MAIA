// @maia:projects
import React, { useEffect, useMemo, useState } from "react";
import { uid } from "../lib/ids.js";
import GlassSurface from "../components/GlassSurface";
import { GlassCard, GlassInput, GlassTextarea } from "../components/GlassCard";
import CreateProjectModal from "../components/CreateProjectModal";
import ProjectIcon, { IconPicker } from "../components/ProjectIcon";

/* -----------------------------------------
   Helpers
----------------------------------------- */
const withDefaults = (p) => ({
  id: p.id ?? uid(),
  name: p.name ?? "Untitled",
  // Migrate or default to 'terminal' if no icon
  icon: p.icon ?? "terminal",
  status: p.status ?? "Active", // Active | Paused | Done
  description: p.description ?? "",
  createdAt: p.createdAt ?? new Date().toISOString(),
  milestones: p.milestones ?? [],
  links: p.links ?? [],
});

const normalize = (s) => (s || "").trim().toLowerCase();

function noteBelongsToProject(note, project) {
  const ids = note.projectIds || [];
  if (project?.id && ids.includes(project.id)) return true;
  if (note.project && project?.name && normalize(note.project) === normalize(project.name)) {
    return true;
  }
  return false;
}

export default function Projects({
  notes,
  projects,
  setProjects,
  selectNote,
  targetProjectId,
  isCreateModalOpen,
  setCreateModalOpen,
}) {
  const [activeId, setActiveId] = useState(null);

  // Sync targetProjectId from parent if provided
  useEffect(() => {
    if (targetProjectId) {
      setActiveId(targetProjectId);
    }
  }, [targetProjectId]);

  // Use lifted state if provided, otherwise local (backwards compat, though App controls it now)
  // But wait, we simplified. We expect props.
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const isModalOpen = isCreateModalOpen !== undefined ? isCreateModalOpen : localModalOpen;
  const setIsModalOpen = setCreateModalOpen || setLocalModalOpen;

  const [showIconPicker, setShowIconPicker] = useState(false);

  // Normalize projects
  const normalizedProjects = useMemo(() => projects.map(withDefaults), [projects]);

  // Set initial active project
  useEffect(() => {
    if (!activeId && normalizedProjects.length > 0 && !targetProjectId) {
      setActiveId(normalizedProjects[0].id);
    }
  }, [normalizedProjects.length, activeId, targetProjectId]);

  const activeProject = useMemo(
    () => normalizedProjects.find((p) => p.id === activeId) || null,
    [normalizedProjects, activeId]
  );

  const linkedNotes = useMemo(() => {
    if (!activeProject) return [];
    return notes.filter((n) => noteBelongsToProject(n, activeProject));
  }, [notes, activeProject]);

  const updateProject = (id, patch) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const handleCreateProject = ({ name, icon }) => {
    const newProj = withDefaults({ name, icon });
    setProjects([...projects, newProj]);
    setActiveId(newProj.id);
  };

  const deleteProject = (id) => {
    if (!confirm("Delete this mission?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) setActiveId(null);
  }

  // Group projects
  const activeList = normalizedProjects.filter(p => p.status === "Active");
  const otherList = normalizedProjects.filter(p => p.status !== "Active");

  return (
    <div className="h-full w-full flex relative overflow-hidden bg-black font-sans text-zinc-200">

      {/* "Opus" Watermark */}
      <div className="absolute bottom-[-1rem] left-[-0.5rem] text-[12rem] md:text-[16rem] leading-none font-bold text-white opacity-[0.34] select-none pointer-events-none z-0 tracking-tighter">
        Opus
      </div>

      {/* Main Grid Container */}
      <div className="relative z-10 w-full h-full p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 pointer-events-none">

        {/* LEFT COLUMN: Project List (Glass Container) */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col justify-start pointer-events-auto">
          <GlassSurface className="flex flex-col !h-auto max-h-full">
            {/* Header */}
            <div className="p-3 md:p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Missions</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <span className="text-lg leading-none mb-0.5">+</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {activeList.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${p.id === activeId
                    ? "bg-white/10 shadow-[inner_0_0_0_1px_rgba(255,255,255,0.05)] text-white"
                    : "hover:bg-white/5 text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  <span className={`text-xl group-hover:scale-110 transition-transform ${p.id === activeId ? "text-white" : "text-zinc-600"}`}>
                    <ProjectIcon name={p.icon} size={20} />
                  </span>
                  <span className="font-medium truncate text-sm">{p.name}</span>
                </button>
              ))}

              {otherList.length > 0 && (
                <div className="pt-4 mt-4 border-t border-white/5">
                  <div className="px-3 mb-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Archived</div>
                  {otherList.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setActiveId(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left opacity-70 hover:opacity-100 ${p.id === activeId ? "bg-white/5 text-white" : "text-zinc-600 hover:bg-white/5"
                        }`}
                    >
                      <span className="text-sm grayscale">
                        <ProjectIcon name={p.icon} size={16} />
                      </span>
                      <span className="truncate text-sm">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </GlassSurface>
        </div>

        {/* RIGHT COLUMN: Details (Content) */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar pointer-events-auto">
          {activeProject ? (
            <div className="space-y-8 pb-32 md:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Title & Meta */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row items-start gap-5">
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white/5 rounded-2xl text-white hover:bg-white/10 hover:scale-105 transition-all shadow-2xl group border border-white/5 flex-shrink-0"
                  >
                    <ProjectIcon name={activeProject.icon} size={48} className="opacity-80 group-hover:opacity-100" />
                  </button>
                  <div className="flex-1 space-y-3 pt-1">
                    <input
                      value={activeProject.name}
                      onChange={e => updateProject(activeProject.id, { name: e.target.value })}
                      className="bg-transparent text-4xl md:text-5xl font-bold text-white w-full outline-none placeholder:text-zinc-700 tracking-tight"
                      placeholder="Mission Name"
                    />
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeProject.status === 'Active' ? 'bg-green-500' :
                          activeProject.status === 'Paused' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} />
                        <select
                          value={activeProject.status}
                          onChange={e => updateProject(activeProject.id, { status: e.target.value })}
                          className="bg-transparent text-xs text-zinc-400 outline-none uppercase tracking-wide font-bold cursor-pointer"
                        >
                          <option value="Active">Active</option>
                          <option value="Paused">Paused</option>
                          <option value="Done">Complete</option>
                        </select>
                      </div>
                      <span className="text-xs text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">Inception: {new Date(activeProject.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProject(activeProject.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Archive/Delete"
                  >
                    <ProjectIcon name="trash" size={18} />
                  </button>
                </div>
              </div>

              {/* Content Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Mission Statement */}
                <div className="lg:col-span-2">
                  <GlassCard className="p-6">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4">Strategic Mission</h3>
                    <GlassTextarea
                      value={activeProject.description}
                      onChange={e => updateProject(activeProject.id, { description: e.target.value })}
                      className="min-h-[120px] text-lg font-light leading-relaxed"
                      placeholder="Define the core objective and desired outcome..."
                    />
                  </GlassCard>
                </div>

                {/* Linked Notes */}
                <GlassCard className="flex flex-col h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                      <ProjectIcon name="writing" size={14} />
                      Intel ({linkedNotes.length})
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {linkedNotes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-sm italic">
                        Use [[project name]] in notes to link logic.
                      </div>
                    ) : (
                      linkedNotes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => selectNote?.(n.id)}
                          className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                        >
                          <div className="text-sm text-zinc-200 group-hover:text-white truncate font-medium">{n.title || "Untitled Note"}</div>
                          <div className="text-[10px] text-zinc-600 mt-1 truncate">{n.preview || "No content..."}</div>
                        </button>
                      ))
                    )}
                  </div>
                </GlassCard>

                {/* Links / Resources */}
                <GlassCard className="flex flex-col h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                      <ProjectIcon name="research" size={14} />
                      Uplinks ({activeProject.links.length})
                    </h3>
                    <button
                      onClick={() => {
                        const url = prompt("Link URL:");
                        if (url) {
                          updateProject(activeProject.id, {
                            links: [...activeProject.links, { id: uid(), url, title: new URL(url).hostname }]
                          });
                        }
                      }}
                      className="text-[10px] px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {activeProject.links.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-sm italic">
                        No external uplinks established.
                      </div>
                    ) : (
                      activeProject.links.map(l => (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                        >
                          <div className="text-sm text-blue-400 group-hover:text-blue-300 truncate font-mono">{l.title}</div>
                          <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{l.url}</div>
                        </a>
                      ))
                    )}
                  </div>
                </GlassCard>

              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <ProjectIcon name="work" size={40} className="opacity-50" />
              </div>
              <p className="text-lg font-light text-zinc-500">Select a mission to analyze.</p>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />

      {/* Icon Picker for Active Project */}
      {showIconPicker && (
        <IconPicker
          currentIcon={activeProject?.icon}
          onSelect={(newIcon) => updateProject(activeProject.id, { icon: newIcon })}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
