// @maia:projects
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { uid } from "../lib/ids.js";
import GlassSurface from "../components/GlassSurface";
import CreateProjectModal from "../components/CreateProjectModal";
import ProjectIcon, { IconPicker } from "../components/ProjectIcon";
import { EmptyState } from "@/components/composed/EmptyState";
import { Briefcase08, Pen01, Setting06, Delete01, PlusSignSquare, LayoutAlignLeft, LayoutAlignRight } from "../components/ui/CustomIcon.jsx";
import OpusLayout from "../features/Opus/OpusLayout.jsx";
import { useData } from "../context/DataContext";

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
  projects,
  setProjects,
  selectNote,
  targetProjectId,
  isCreateModalOpen,
  setCreateModalOpen,
}) {
  const { deleteProject: deleteProjectCascade } = useData();
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

  const [pendingDelete, setPendingDelete] = useState(null);

  const deleteProject = (id) => setPendingDelete(id);

  const confirmDeleteProject = () => {
    const id = pendingDelete;
    // Must go through DataContext: removing the project here with a bare
    // setProjects skipped the whole cascade, so deleting a project left its
    // notes still carrying the dead id and its tasks and sessions pointing at
    // a project that no longer existed.
    deleteProjectCascade(id);
    if (activeId === id) setActiveId(null);
  }

  // Sidebar context menu
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [iconPickerId, setIconPickerId] = useState(null);
  const renameInputRef = useRef(null);

  const startRename = (p) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
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
    <div className="h-full w-full flex relative overflow-hidden bg-background text-foreground">

      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-overlay bg-background/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={closeMobile} />
      )}

      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex">

        {/* SIDEBAR: Project List — hidden on mobile, overlay when mobileOpen */}
        <div
          className={`flex-none h-full border-r border-border bg-background flex flex-col relative group/sidebar transition-all duration-300 ease-in-out
            ${mobileOpen ? 'fixed inset-y-0 left-0 z-50 shadow-2xl' : 'hidden md:flex'}`}
          style={{ width: mobileOpen ? 280 : effectiveWidth }}
        >
          {/* Header */}
          {/* Header */}
          <div className={`flex-none p-6 border-b border-border-subtle flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center overflow-hidden transition-opacity duration-300 ${effectiveWidth < 120 ? 'opacity-0 w-0' : 'opacity-100'}`}>
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Opus</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              aria-label="New project"
              className="flex items-center justify-center transition-colors shrink-0 text-muted-foreground hover:text-foreground outline-hidden"
            >
              <PlusSignSquare size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {activeList.length === 0 && effectiveWidth > 120 && (
              <EmptyState size="inline" title="No active projects" className="py-4" />
            )}

            {activeList.map(p => {
              const isRenaming = renamingId === p.id;
              const rowClass = `w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group border cursor-pointer ${p.id === activeId
                ? isCollapsed
                  ? "bg-transparent border-transparent shadow-none"
                  : "bg-overlay-subtle border-border text-foreground shadow-lg"
                : "border-transparent text-muted-foreground hover:text-foreground-secondary " + (isCollapsed ? "" : "hover:bg-overlay-subtle")
                } ${effectiveWidth < 120 ? 'justify-center' : ''}`;

              const rowBody = (
                <>
                  <span className={`shrink-0 ${p.id === activeId ? "text-foreground" : "text-subtle-foreground"} ${isCollapsed && p.id === activeId ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}`}>
                    <ProjectIcon name={p.icon} size={18} color={p.iconColor} />
                  </span>
                  {effectiveWidth >= 120 && (
                    isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-overlay border border-border rounded-lg px-2 py-0.5 text-sm text-foreground outline-hidden min-w-0"
                      />
                    ) : (
                      <span className="font-medium truncate text-sm flex-1">{p.name}</span>
                    )
                  )}
                </>
              );

              return (
                <Menu.Context key={p.id}>
                  <Menu.ContextTrigger
                    render={
                      /* A real <button> so the project switcher — this page's
                         primary navigation — is reachable by keyboard. It drops
                         to a <div> only while renaming, because an <input>
                         inside a <button> is invalid HTML. */
                      isRenaming ? (
                        <div className={rowClass}>{rowBody}</div>
                      ) : (
                        <button
                          type="button"
                          aria-label={p.name}
                          aria-current={p.id === activeId ? "true" : undefined}
                          className={rowClass}
                          onClick={() => { setActiveId(p.id); closeMobile(); }}
                          title={effectiveWidth < 120 ? p.name : ''}
                        >
                          {rowBody}
                        </button>
                      )
                    }
                  />
                  <Menu.ContextContent>
                    <Menu.ContextItem onClick={() => startRename(p)}>
                      <Pen01 size={14} /> Rename
                    </Menu.ContextItem>
                    <Menu.ContextItem onClick={() => setIconPickerId(p.id)}>
                      <Setting06 size={14} /> Edit icon
                    </Menu.ContextItem>
                    <Menu.ContextSeparator />
                    <ContextDangerItem onClick={() => deleteProject(p.id)}>
                      <Delete01 size={14} /> Delete
                    </ContextDangerItem>
                  </Menu.ContextContent>
                </Menu.Context>
              );
            })}

            {otherList.length > 0 && effectiveWidth > 120 && (
              <div className="pt-4 mt-4 border-t border-border-subtle">
                <div className="px-3 mb-2 text-xs text-subtle-foreground uppercase tracking-widest font-bold">Archived</div>
                {otherList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    aria-label={`Open archived project ${p.name}`}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left opacity-70 hover:opacity-100 ${p.id === activeId ? "bg-overlay-subtle text-foreground" : "text-subtle-foreground hover:bg-overlay-subtle"
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
            <div className="flex-none border-t border-border-subtle p-4 flex flex-col gap-2 bg-background/50">
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">
                Manage {activeProject.name}
              </div>
              {['Active', 'Paused', 'Done'].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setProjects(prev => prev.map(p => p.id === activeId ? { ...p, status } : p));
                    closeMobile();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeProject.status === status ? "bg-overlay text-foreground" : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-overlay-subtle"
                    }`}
                >
                  Set to {status === 'Done' ? 'Archived' : status}
                </button>
              ))}
              <div className="h-px bg-overlay-subtle my-1" />
              <button
                onClick={() => {
                  deleteProject(activeId);
                  closeMobile();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                Delete Project
              </button>
            </div>
          )}

          {/* Collapse Toggle */}
          <div className={`hidden md:flex flex-none border-t border-border-subtle p-2 items-center ${isCollapsed ? 'justify-center' : 'justify-end pr-6'}`}>
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors outline-hidden"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
          <div className="md:hidden flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border-subtle">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-overlay-subtle border border-border text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
              aria-label="Open project list"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            {activeProject && (
              <span className="text-xs text-muted-foreground uppercase tracking-widest truncate">{activeProject.name}</span>
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
              <div className="h-full flex flex-col items-center justify-center text-subtle-foreground animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-full bg-overlay-subtle flex items-center justify-center mb-6">
                  <Briefcase08 size={40} className="opacity-50" />
                </div>
                <p className="text-lg font-light text-muted-foreground">Select an Opus.</p>
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

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDeleteProject}
        title="Delete this project?"
        description="This can't be undone. Notes linked to it are kept."
        confirmLabel="Delete"
      />
    </div>
  );
}


