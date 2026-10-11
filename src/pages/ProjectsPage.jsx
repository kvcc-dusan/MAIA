// @maia:projects
import React, { useEffect, useMemo, useState } from "react";
import { Suitcase } from "@/components/icons";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import { ShellSidebar } from "@/components/shell/ShellContext";
import { uid } from "../lib/ids.js";
import GlassSkeleton from "../components/GlassSkeleton";
import CreateProjectModal from "../components/CreateProjectModal";
import IconPicker from "../components/projectIcon/IconPicker";
import OpusLayout from "../features/Opus/OpusLayout.jsx";
import ProjectSidebar from "../features/Opus/components/ProjectSidebar";
import { normalizeProject } from "../features/Opus/lib/projectModel.js";
import { useData } from "../context/DataContext";
import styles from "./ProjectsPage.module.css";

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
  activeProjectId,
  onSelectProject,
  isCreateModalOpen,
  setCreateModalOpen,
}) {
  const { updateProject, deleteProject: deleteProjectCascade, projectsLoading, addSampleProject } = useData();
  // The selection lives in App so back/forward and the palette can drive it.
  const activeId = activeProjectId;
  const setActiveId = onSelectProject;

  // Use lifted state if provided
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const isModalOpen = isCreateModalOpen !== undefined ? isCreateModalOpen : localModalOpen;
  const setIsModalOpen = setCreateModalOpen || setLocalModalOpen;

  // Normalize projects
  const normalizedProjects = useMemo(() => projects.map(withDefaults), [projects]);

  // Nothing selected, or the selected project is gone: land on the first one.
  useEffect(() => {
    if (normalizedProjects.length > 0 && !normalizedProjects.some((p) => p.id === activeId)) {
      setActiveId(normalizedProjects[0].id);
    }
  }, [normalizedProjects, activeId, setActiveId]);

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

  const openCreateModal = () => setIsModalOpen(true);

  const listProps = {
    activeList,
    otherList,
    activeId,
    renamingId,
    onSelect: setActiveId,
    onSetStatus: (id, status) => updateProject(id, { status }),
    onStartRename: setRenamingId,
    onCommitRename: commitRename,
    onCancelRename: () => setRenamingId(null),
    onEditIcon: setIconPickerId,
    onDelete: requestDelete,
  };

  const iconPickerProject = normalizedProjects.find((p) => p.id === iconPickerId);

  return (
    <div className={styles.page}>
      <ShellSidebar>
        <ProjectSidebar onCreate={openCreateModal} onAddSample={() => setActiveId(addSampleProject().id)} {...listProps} />
      </ShellSidebar>

      <div className={styles.scroll}>
        {activeProject ? (
          <OpusLayout
            key={activeProject.id} // Re-mount on switch to reset local states if any
            projectId={activeProject.id}
            selectNote={selectNote}
          />
        ) : projectsLoading ? (
          <GlassSkeleton />
        ) : (
          <div className={styles.empty}>
            <EmptyState
              size="page"
              icon={Suitcase}
              title="No projects yet"
              description="Create a project to start tracking its tasks, milestones and notes."
              action={<Button onClick={openCreateModal}>New project</Button>}
            />
          </div>
        )}
      </div>

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
