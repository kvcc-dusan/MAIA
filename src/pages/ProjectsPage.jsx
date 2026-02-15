// @maia:projects
import React, { useEffect, useMemo, useState } from "react";
import { uid } from "../lib/ids.js";
import GlassSurface from "../components/GlassSurface";
import CreateProjectModal from "../components/CreateProjectModal";
import ProjectIcon from "../components/ProjectIcon";
import OpusLayout from "../features/Opus/OpusLayout.jsx";

/* -----------------------------------------
   Helpers
----------------------------------------- */
const withDefaults = (p) => ({
  id: p.id ?? uid(),
  name: p.name ?? "Untitled",
  icon: p.icon ?? "terminal",
  iconColor: p.iconColor ?? "white",
  status: p.status ?? "Active", // Active | Paused | Done
  description: p.description ?? "",
  createdAt: p.createdAt ?? new Date().toISOString(),
  milestones: p.milestones ?? [],
  links: p.links ?? [],
  // OPUS Defaults
  objective: p.objective ?? "",
  successCriteria: p.successCriteria ?? [],
  pinnedNoteIds: p.pinnedNoteIds ?? [],
  assets: p.assets ?? [],
});

export default function Projects({
  notes,
  projects,
  setProjects,
  setNotes,
  selectNote,
  targetProjectId,
  pushToast,
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

  // Use lifted state if provided
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const isModalOpen = isCreateModalOpen !== undefined ? isCreateModalOpen : localModalOpen;
  const setIsModalOpen = setCreateModalOpen || setLocalModalOpen;

  // Normalize projects
  const normalizedProjects = useMemo(() => projects.map(withDefaults), [projects]);

  // Set initial active project
  useEffect(() => {
    if (!activeId && normalizedProjects.length > 0 && !targetProjectId) {
      setActiveId(normalizedProjects[0].id);
    }
  }, [normalizedProjects, activeId, targetProjectId]);

  const activeProject = useMemo(
    () => normalizedProjects.find((p) => p.id === activeId) || null,
    [normalizedProjects, activeId]
  );

  const handleCreateProject = ({ name, icon, iconColor }) => {
    const newProj = withDefaults({ name, icon, iconColor });
    // We defer to DataContext's createProject usually but here we are manipulating array directly via props?
    // Based on App.jsx, setProjects is passed directly. 
    // Better to use a pattern consistent with DataContext. 
    // Ideally we'd call createProject from context, but props are passed here.
    // For now, simple array append ok, but we need ensuring schema.
    setProjects([...projects, newProj]);
    setActiveId(newProj.id);
  };

  const deleteProject = (id) => {
    if (!confirm("Are you sure you want to archive this mission?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) setActiveId(null);
  }

  // Group projects
  const activeList = normalizedProjects.filter(p => p.status === "Active");
  const otherList = normalizedProjects.filter(p => p.status !== "Active");

  // Sidebar Logic
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('opus_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('opus_sidebar_collapsed', JSON.stringify(newState));
      return newState;
    });
  };

  // Fixed widths: 320px expanded, 56px collapsed
  const effectiveWidth = isCollapsed ? 56 : 320;

  return (
    <div className="h-full w-full flex relative overflow-hidden bg-black font-mono text-zinc-200">


      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex pointer-events-none">

        {/* SIDEBAR: Project List */}
        <div
          className="flex-none h-full border-r border-white/10 bg-black pointer-events-auto flex flex-col relative group/sidebar transition-[width] duration-300 ease-in-out"
          style={{ width: effectiveWidth }}
        >
          {/* Header */}
          {/* Header */}
          <div className={`flex-none p-6 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-2 overflow-hidden transition-opacity duration-300 ${effectiveWidth < 120 ? 'opacity-0 w-0' : 'opacity-100'}`}>
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Projects</span>
              <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-600 font-mono">OPUS</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`
                w-8 h-8 flex items-center justify-center rounded-lg transition-colors border shrink-0
                ${isCollapsed
                  ? "bg-transparent border-transparent text-zinc-400 hover:text-white"
                  : "bg-white/5 hover:bg-white/10 text-white border-white/5"}
              `}
            >
              <span className="text-lg leading-none mb-0.5">+</span>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {activeList.length === 0 && effectiveWidth > 120 && (
              <div className="p-4 text-center text-xs text-zinc-600 italic">No active projects.</div>
            )}

            {activeList.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group border ${p.id === activeId
                  ? isCollapsed
                    ? "bg-transparent border-transparent shadow-none" // Collapsed active: icon only
                    : "bg-white/5 border-white/10 text-white shadow-lg" // Expanded active: box
                  : "border-transparent text-zinc-500 hover:text-zinc-300 " + (isCollapsed ? "" : "hover:bg-white/5")
                  } ${effectiveWidth < 120 ? 'justify-center' : ''}`}
                title={effectiveWidth < 120 ? p.name : ''}
              >
                <span className={`text-xl group-hover:scale-110 transition-transform ${p.id === activeId ? "text-white" : "text-zinc-600"} ${isCollapsed && p.id === activeId ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}`}>
                  <ProjectIcon name={p.icon} size={20} color={p.iconColor} />
                </span>
                <span className={`font-medium truncate text-sm transition-opacity duration-300 ${effectiveWidth < 120 ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{p.name}</span>
              </button>
            ))}

            {otherList.length > 0 && effectiveWidth > 120 && (
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
                      <ProjectIcon name={p.icon} size={16} color={p.iconColor} />
                    </span>
                    <span className="truncate text-sm">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collapse Toggle */}
          {/* Collapse Toggle */}
          <div className={`flex-none border-t border-white/5 p-2 flex items-center ${isCollapsed ? 'justify-center' : 'justify-end pr-6'}`}>
            <button
              onClick={toggleCollapse}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              >
                <path d="M9 20V4M9 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2837 19.7822 18.9074C20 18.48 20 17.921 20 16.8031V7.19691C20 6.07899 20 5.5192 19.7822 5.0918C19.5905 4.71547 19.2837 4.40973 18.9074 4.21799C18.4796 4 17.9203 4 16.8002 4H9M9 20H7.19692C6.07901 20 5.5192 20 5.0918 19.7822C4.71547 19.5905 4.40973 19.2837 4.21799 18.9074C4 18.4796 4 17.9203 4 16.8002V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H9" />
              </svg>
            </button>
          </div>

        </div>

        {/* MAIN CONTENT: Opus Layout */}
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar pointer-events-auto">
          {activeProject ? (
            <OpusLayout
              key={activeProject.id} // Re-mount on switch to reset local states if any
              projectId={activeProject.id}
              selectNote={selectNote}
              onDeleteProject={deleteProject}
            />
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
    </div >
  );
}
