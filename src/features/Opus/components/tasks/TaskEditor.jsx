import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Select } from "@/components/composed/Select";
import { SidePanel } from "@/components/composed/SidePanel";
import { PRIORITY_OPTIONS_SHORT, STATUS_OPTIONS, estimateOptionsFor, workstreamColor } from "./taskDisplay";
import { draftFromTask, emptyDraft, validateDraft } from "./taskDraft";
import styles from "./TaskEditor.module.css";

const FORM_ID = "tasks-task-form";

const makeDraft = (mode, task, initial) => (mode === "edit" && task ? draftFromTask(task) : emptyDraft(initial));

/**
 * Create and edit panel. It stays mounted so it can animate out; the draft
 * resets whenever `session` changes (TasksTab bumps it on every open).
 */
export default function TaskEditor({ open, mode, session, task, initial, project, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => makeDraft(mode, task, initial));
  const [seenSession, setSeenSession] = useState(session);
  const [errors, setErrors] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (seenSession !== session) {
    setSeenSession(session);
    setDraft(makeDraft(mode, task, initial));
    setErrors({});
  }

  const isEdit = mode === "edit";
  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }));
  const workstreamOptions = [...(project.workstreams ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((w) => ({ value: w.id, label: w.name, color: workstreamColor(w) }));
  const milestoneOptions = [...(project.milestones ?? [])]
    .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
    .map((m) => ({ value: m.id, label: m.title }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(draft);
    onClose();
  };

  const footer = (
    <>
      {isEdit && (
        <Button variant="danger" className={styles.delete} onClick={() => setIsConfirmingDelete(true)}>Delete task</Button>
      )}
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" form={FORM_ID}>{isEdit ? "Save changes" : "Add task"}</Button>
    </>
  );

  return (
    <>
      <SidePanel open={open} onClose={onClose} title={isEdit ? "Edit task" : "New task"} footer={footer}>
        <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input label="Title" value={draft.title} onChange={(e) => patch({ title: e.target.value })} error={errors.title} autoFocus />
          <Textarea label="Notes" value={draft.desc} onChange={(e) => patch({ desc: e.target.value })} rows={3} />
          <div className={styles.row}>
            <Select
              label="Workstream"
              value={draft.workstreamId}
              options={workstreamOptions}
              clearLabel="None"
              placeholder="None"
              onChange={(workstreamId) => patch({ workstreamId })}
            />
            <Select
              label="Milestone"
              value={draft.milestoneId}
              options={milestoneOptions}
              clearLabel="None"
              placeholder="None"
              onChange={(milestoneId) => patch({ milestoneId })}
            />
          </div>
          <div className={styles.row}>
            <Select label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={(status) => patch({ status })} />
            <Select label="Priority" value={draft.priority} options={PRIORITY_OPTIONS_SHORT} onChange={(priority) => patch({ priority })} />
          </div>
          <div className={styles.row}>
            <Input label="Owner" value={draft.owner} onChange={(e) => patch({ owner: e.target.value })} />
            <DateTimeField
              dateOnly
              label="Due date"
              value={draft.due ? `${draft.due}T12:00` : ""}
              onChange={(value) => patch({ due: String(value ?? "").slice(0, 10) })}
            />
          </div>
          <div className={styles.row}>
            <Select
              label="Size"
              value={draft.estimate}
              options={estimateOptionsFor(draft.estimate)}
              clearLabel="No size"
              placeholder="No size"
              onChange={(estimate) => patch({ estimate })}
            />
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title={`Delete "${task?.title ?? "this task"}"?`}
        description="The task is removed from the project. This can't be undone."
        confirmLabel="Delete task"
        onConfirm={() => { onDelete(); onClose(); }}
      />
    </>
  );
}
