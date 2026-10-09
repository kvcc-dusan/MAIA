// @maia:projects
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FolderKanban, PanelLeftOpen, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { EmptyState } from "@/components/composed/EmptyState";
import { SidePanel } from "@/components/composed/SidePanel";
import { SectionLabel } from "@/components/composed/SectionBits";
import { Button } from "@/components/arc/button/button";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { uid } from "../lib/ids.js";
import CreateProjectModal from "../components/CreateProjectModal";
import IconPicker from "../components/projectIcon/IconPicker";
import OpusLayout from "../features/Opus/OpusLayout.jsx";
import ProjectList from "../features/Opus/components/ProjectList";
import ProjectSidebar from "../features/Opus/components/ProjectSidebar";
import { normalizeProject } from "../features/Opus/lib/projectModel.js";
import { useData } from "../context/DataContext";
import styles from "./ProjectsPage.module.css";

const SIDEBAR_COLLAPSED_KEY = "opus_sidebar_collapsed";

// "Done" is stored; the UI calls it Archived.
const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Paused", label: "Paused" },
  { value: "Done", label: "Archived" },
];

const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
};

const writeCollapsed = (isCollapsed) => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  } catch {
    // storage blocked: the choice lasts for this session only
  }
};

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
  const { updateProject, deleteProject: deleteProjectCascade } = useData();
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
    const newProj = normalizeProject(withDefaults({ name, icon, iconColor }));
    // Appends (new projects land at the bottom of the list) through a functional
    // updater, so the write sees the stored array instead of rewriting the
    // normalized copy this component holds. DataContext.createProject prepends
    // and has no icon fields, so it isn't a drop-in.
    setProjects((prev) => [...prev, newProj]);
    setActiveId(newProj.id);
  };

  // The target outlives the dialog so its text doesn't change while it fades out.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const requestDelete = (id) => {
    const name = normalizedProjects.find((p) => p.id === id)?.name;
    setDeleteTarget({ id, name: name ?? "this project" });
    setIsDeleteOpen(true);
  };

  const confirmDeleteProject = () => {
    const id = deleteTarget.id;
    // Must go through DataContext: removing the project here with a bare
    // setProjects skipped the whole cascade, so deleting a project left its
    // notes still carrying the dead id and its tasks and sessions pointing at
    // a project that no longer existed.
    deleteProjectCascade(id);
    if (activeId === id) setActiveId(null);
  };

  // Rename and icon edit
  const [renamingId, setRenamingId] = useState(null);
  const [iconPickerId, setIconPickerId] = useState(null);

  const commitRename = (id, name) => {
    if (name.trim()) updateProject(id, { name: name.trim() });
    setRenamingId(null);
  };

  // Group projects
  const activeList = normalizedProjects.filter((p) => p.status === "Active");
  const otherList = normalizedProjects.filter((p) => p.status !== "Active");

  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    writeCollapsed(next);
  };

  // Below 768px the list opens in a drawer instead of a sidebar.
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const openCreateModal = () => setIsModalOpen(true);
  const createFromDrawer = () => {
    closeMobile();
    openCreateModal();
  };

  const listProps = {
    activeList,
    otherList,
    activeId,
    renamingId,
    onSelect: (id) => { setActiveId(id); closeMobile(); },
    onStartRename: setRenamingId,
    onCommitRename: commitRename,
    onCancelRename: () => setRenamingId(null),
    onEditIcon: setIconPickerId,
    onDelete: requestDelete,
  };

  const iconPickerProject = normalizedProjects.find((p) => p.id === iconPickerId);

  return (
    <div className={styles.page}>
      <ProjectSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        onCreate={openCreateModal}
        {...listProps}
      />

      <div className={styles.main}>
        {/* Mobile project switcher: inside the content area, not a fixed overlay */}
        <div className={styles.mobileBar}>
          <Button variant="secondary" aria-haspopup="dialog" onClick={() => setMobileOpen(true)}>
            <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden="true" />
            Projects
          </Button>
        </div>

        <div className={styles.scroll}>
          {activeProject ? (
            <OpusLayout
              key={activeProject.id} // Re-mount on switch to reset local states if any
              projectId={activeProject.id}
              selectNote={selectNote}
            />
          ) : (
            <div className={styles.empty}>
              <EmptyState
                size="page"
                icon={FolderKanban}
                title={normalizedProjects.length ? "No project selected" : "No projects yet"}
                description={
                  normalizedProjects.length
                    ? "Pick a project from the list to see its tasks, milestones and notes."
                    : "Create a project to start tracking its tasks, milestones and notes."
                }
                action={<Button onClick={openCreateModal}>New project</Button>}
              />
            </div>
          )}
        </div>
      </div>

      <SidePanel open={mobileOpen} onClose={closeMobile} side="left" title="Projects">
        <div className={styles.drawerBody}>
          <Button variant="secondary" onClick={createFromDrawer}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            New project
          </Button>
          <ProjectList {...listProps} onCreate={createFromDrawer} />

          {activeProject && (
            <section className={styles.manage}>
              <SectionLabel as="h3">Manage {activeProject.name}</SectionLabel>
              <SegmentedControl
                label="Project status"
                options={STATUS_OPTIONS}
                value={activeProject.status}
                onValueChange={(status) => { updateProject(activeId, { status }); closeMobile(); }}
              />
              <Button variant="danger" onClick={() => { requestDelete(activeId); closeMobile(); }}>
                Delete project
              </Button>
            </section>
          )}
        </div>
      </SidePanel>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />

      {/* Icon picker for sidebar */}
      {iconPickerProject && (
        <IconPicker
          currentIcon={iconPickerProject.icon}
          currentColor={iconPickerProject.iconColor}
          onSelect={(icon, iconColor) => updateProject(iconPickerId, { icon, iconColor })}
          onClose={() => setIconPickerId(null)}
        />
      )}

      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDeleteProject}
        title={`Delete ${deleteTarget?.name ?? "this project"}?`}
        description="Linked notes, tasks and sessions are kept but unlinked. The project's milestones, decisions and questions are removed. This can't be undone."
        confirmLabel="Delete project"
      />
    </div>
  );
}
