// @maia:projects
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { uid } from "../lib/ids.js";
import GlassSurface from "../components/GlassSurface";
import CreateProjectModal from "../components/CreateProjectModal";
import ProjectIcon, { IconPicker } from "../components/ProjectIcon";
import { Briefcase08, Pen01, Setting06, Delete01, PlusSignSquare, LayoutAlignLeft, LayoutAlignRight } from "../components/ui/CustomIcon.jsx";
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

  const updateProject = useCallback((id, patch) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, [setProjects]);

  const deleteProject = (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) setActiveId(null);
  }

  // Sidebar context menu
  const [ctxMenu, setCtxMenu] = useState(null); // { projectId, x, y }
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [iconPickerId, setIconPickerId] = useState(null);
  const renameInputRef = useRef(null);

  const openCtxMenu = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    const W = 176, H = 130;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = e.clientX + 4, y = e.clientY - 4;
    if (x + W > vw - 8) x = e.clientX - W - 4;
    if (y + H > vh - 8) y = vh - H - 8;
    setCtxMenu({ projectId, x, y });
  };

  const closeCtx = () => setCtxMenu(null);

  const startRename = (p) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
    closeCtx();
    setTimeout(() => renameInputRef.current?.focus(), 30);
  };

  const commitRename = () => {
    if (renameValue.trim()) updateProject(renamingId, { name: renameValue.trim() });
    setRenamingId(null);
  };

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

  // Fixed widths: 280px (tablet) / 320px (lg+) expanded, 52px collapsed
  const effectiveWidth = isCollapsed ? 52 : 280;

  // Mobile sidebar overlay
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="h-full w-full flex relative overflow-hidden bg-black font-mono text-zinc-200">

      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeMobile} />
      )}

      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex">

        {/* SIDEBAR: Project List — hidden on mobile, overlay when mobileOpen */}
        <div
          className={`flex-none h-full border-r border-white/10 bg-black flex flex-col relative group/sidebar transition-all duration-300 ease-in-out
            ${mobileOpen ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : 'hidden md:flex'}`}
          style={{ width: mobileOpen ? 280 : effectiveWidth }}
        >
          {/* Header */}
          {/* Header */}
          <div className={`flex-none p-6 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center overflow-hidden transition-opacity duration-300 ${effectiveWidth < 120 ? 'opacity-0 w-0' : 'opacity-100'}`}>
              <span className="text-fluid-2xs uppercase tracking-widest text-zinc-500 font-bold">Opus</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center transition-colors shrink-0 text-zinc-500 hover:text-white outline-none"
            >
              <PlusSignSquare size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {activeList.length === 0 && effectiveWidth > 120 && (
              <div className="p-4 text-center text-xs text-zinc-600 italic">No active projects.</div>
            )}

            {activeList.map(p => (
              <div
                key={p.id}
                onContextMenu={e => openCtxMenu(e, p.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group border cursor-pointer ${p.id === activeId
                  ? isCollapsed
                    ? "bg-transparent border-transparent shadow-none"
                    : "bg-white/5 border-white/10 text-white shadow-lg"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 " + (isCollapsed ? "" : "hover:bg-white/5")
                  } ${effectiveWidth < 120 ? 'justify-center' : ''}`}
                onClick={() => { setActiveId(p.id); closeMobile(); }}
                title={effectiveWidth < 120 ? p.name : ''}
              >
                <span className={`shrink-0 ${p.id === activeId ? "text-white" : "text-zinc-600"} ${isCollapsed && p.id === activeId ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}`}>
                  <ProjectIcon name={p.icon} size={18} color={p.iconColor} />
                </span>
                {effectiveWidth >= 120 && (
                  renamingId === p.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-2 py-0.5 text-sm text-white outline-none font-mono min-w-0"
                    />
                  ) : (
                    <span className="font-medium truncate text-sm flex-1">{p.name}</span>
                  )
                )}
              </div>
            ))}

            {otherList.length > 0 && effectiveWidth > 120 && (
              <div className="pt-4 mt-4 border-t border-white/5">
                <div className="px-3 mb-2 text-fluid-3xs text-zinc-600 uppercase tracking-widest font-bold">Archived</div>
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
          {/* Mobile Sidebar Settings (Only visible on mobile when a project is active) */}
          {mobileOpen && activeProject && (
            <div className="flex-none border-t border-white/5 p-4 flex flex-col gap-2 bg-black/50">
              <div className="text-fluid-3xs text-zinc-500 uppercase tracking-widest font-bold mb-2">
                Manage {activeProject.name}
              </div>
              {['Active', 'Paused', 'Done'].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setProjects(prev => prev.map(p => p.id === activeId ? { ...p, status } : p));
                    closeMobile();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeProject.status === status ? "bg-white/10 text-white" : "border border-transparent text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  Set to {status === 'Done' ? 'Archived' : status}
                </button>
              ))}
              <div className="h-px bg-white/5 my-1" />
              <button
                onClick={() => {
                  deleteProject(activeId);
                  closeMobile();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition-colors"
              >
                Delete Project
              </button>
            </div>
          )}

          {/* Collapse Toggle */}
          <div className={`hidden md:flex flex-none border-t border-white/5 p-2 items-center ${isCollapsed ? 'justify-center' : 'justify-end pr-6'}`}>
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center text-zinc-500 hover:text-white transition-colors outline-none"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <LayoutAlignRight size={20} strokeWidth="1.5" />
              ) : (
                <LayoutAlignLeft size={20} strokeWidth="1.5" />
              )}
            </button>
          </div>

        </div>

        {/* MAIN CONTENT: Opus Layout */}
        <div className="flex-1 h-full overflow-hidden">
          {/* Mobile sidebar toggle — inside the content area, not a fixed overlay */}
          <div className="md:hidden flex items-center gap-3 px-4 pt-4 pb-2 border-b border-white/5">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Open project list"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            {activeProject && (
              <span className="text-xs text-zinc-400 font-mono uppercase tracking-widest truncate">{activeProject.name}</span>
            )}
          </div>
          <div className="h-full overflow-y-auto custom-scrollbar">
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
                  <Briefcase08 size={40} className="opacity-50" />
                </div>
                <p className="text-lg font-light text-zinc-500">Select an Opus.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />

      {/* Sidebar context menu */}
      {ctxMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeCtx} onContextMenu={e => { e.preventDefault(); closeCtx(); }} />
          <div
            className="fixed z-[9999] w-44 bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {(() => {
              const p = normalizedProjects.find(p => p.id === ctxMenu.projectId);
              if (!p) return null;
              return (
                <>
                  <CtxItem onClick={() => startRename(p)} icon={<Pen01 size={14} />}>Rename</CtxItem>
                  <CtxItem onClick={() => { setIconPickerId(p.id); closeCtx(); }} icon={<Setting06 size={14} />}>Edit Icon</CtxItem>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <CtxItem
                    onClick={() => { deleteProject(p.id); closeCtx(); }}
                    className="text-red-400 hover:bg-red-500/10"
                    icon={<Delete01 size={14} />}
                  >
                    Delete
                  </CtxItem>
                </>
              );
            })()}
          </div>
        </>,
        document.body
      )}

      {/* Icon picker for sidebar */}
      {iconPickerId && (() => {
        const p = normalizedProjects.find(p => p.id === iconPickerId);
        if (!p) return null;
        return (
          <IconPicker
            currentIcon={p.icon}
            currentColor={p.iconColor}
            onSelect={(icon, iconColor) => updateProject(iconPickerId, { icon, iconColor })}
            onClose={() => setIconPickerId(null)}
          />
        );
      })()}
    </div>
  );
}

function CtxItem({ onClick, icon, children, className = "text-zinc-300 hover:bg-white/[0.08] hover:text-white" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2.5 transition-colors ${className}`}
    >
      <span className="text-[11px] opacity-70">{icon}</span>
      {children}
    </button>
  );
}
