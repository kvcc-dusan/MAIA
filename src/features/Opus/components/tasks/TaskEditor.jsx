import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { SidePanel } from "@/components/composed/SidePanel";
import { statusLabel } from "./taskDisplay";
import { draftFromTask, emptyDraft, validateDraft } from "./taskDraft";
import TaskForm from "./TaskForm";
import styles from "./TaskEditor.module.css";

const FORM_ID = "task-form";

const makeDraft = (mode, task, initial) => (mode === "edit" && task ? draftFromTask(task) : emptyDraft(initial));

/**
 * Create and edit panel used by the Board and the Tasks tab. It stays mounted
 * so it can animate out; the draft resets whenever `session` changes (the tabs
 * bump it on every open).
 */
export default function TaskEditor({ open, mode, session, task, initial, project, people = [], onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => makeDraft(mode, task, initial));
  const [seenSession, setSeenSession] = useState(session);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (seenSession !== session) {
    setSeenSession(session);
    setDraft(makeDraft(mode, task, initial));
    setErrors({});
    setSaveError(null);
  }

  const isEdit = mode === "edit";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (error) {
      console.error("TaskEditor: save failed", error);
      setSaveError("That didn't save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const footer = (
    <>
      {isEdit && (
        <Button variant="danger" className={styles.delete} onClick={() => setIsConfirmingDelete(true)}>Delete task</Button>
      )}
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" form={FORM_ID} loading={isSaving}>{isEdit ? "Save changes" : "Add task"}</Button>
    </>
  );

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={isEdit ? "Edit task" : "New task"}
        description={!isEdit && initial?.status ? `Adds to ${statusLabel(draft.status)}` : undefined}
        footer={footer}
      >
        <TaskForm
          formId={FORM_ID}
          draft={draft}
          errors={errors}
          saveError={saveError}
          project={project}
          people={people}
          onChange={setDraft}
          onSubmit={handleSubmit}
        />
      </SidePanel>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title={`Delete "${task?.title ?? "this task"}"?`}
        description="The task is removed from the project and from every list it appears in. This cannot be undone."
        confirmLabel="Delete task"
        onConfirm={() => { onDelete(); onClose(); }}
      />
    </>
  );
}
