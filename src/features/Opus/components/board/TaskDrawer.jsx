import React, { useId, useState } from "react";
import { Target } from "lucide-react";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Select } from "@/components/composed/Select";
import { SidePanel } from "@/components/composed/SidePanel";
import { SCHEDULE_OPTIONS, STATUS_LABELS, STATUS_ORDER, estimateOptionsFor } from "./model";
import { draftFromTask, emptyDraft, validateDraft } from "./taskForm";
import styles from "./TaskDrawer.module.css";

const FORM_ID = "board-task-form";
const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }));

const PRIORITY_OPTIONS = [
  { value: "p1", label: "High" },
  { value: "p2", label: "Medium" },
  { value: "p3", label: "Normal" },
];

const makeDraft = (mode, task, initial) => (mode === "edit" && task ? draftFromTask(task) : emptyDraft(initial));

/**
 * Create and edit drawer. It stays mounted so the panel can animate out; the
 * draft resets whenever `session` changes (BoardTab bumps it on every open).
 */
export default function TaskDrawer({ open, mode, session, task, initial, project, people = [], onClose, onSave, onDelete, onSetNextAction }) {
  const listId = useId();
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
  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }));
  const workstreamOptions = [...project.workstreams]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((w) => ({ value: w.id, label: w.name }));
  const milestoneOptions = [...project.milestones]
    .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
    .map((m) => ({ value: m.id, label: m.title }));

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
      console.error("TaskDrawer: save failed", error);
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
        description={isEdit ? undefined : `Adds to ${STATUS_LABELS[draft.status]}`}
        footer={footer}
      >
        <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            error={errors.title}
            autoFocus
          />
          <Textarea label="Description" value={draft.desc} onChange={(e) => patch({ desc: e.target.value })} rows={4} />
          <div className={styles.row}>
            <Select label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={(status) => patch({ status })} />
            <Select label="Schedule" value={draft.schedule} options={SCHEDULE_OPTIONS} onChange={(schedule) => patch({ schedule })} />
          </div>
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
            <Input
              label="Owner"
              value={draft.owner}
              onChange={(e) => patch({ owner: e.target.value })}
              list={listId}
              autoComplete="off"
            />
            <datalist id={listId}>
              {people.map((name) => <option key={name} value={name} />)}
            </datalist>
            <Select label="Priority" value={draft.priority} options={PRIORITY_OPTIONS} onChange={(priority) => patch({ priority: priority ?? "p3" })} />
          </div>
          <div className={styles.row}>
            <DateTimeField dateOnly label="Due date" value={draft.due} onChange={(due) => patch({ due })} />
            <Select
              label="Estimate"
              value={draft.estimate}
              options={estimateOptionsFor(draft.estimate)}
              clearLabel="No estimate"
              placeholder="No estimate"
              onChange={(estimate) => patch({ estimate })}
            />
          </div>
          {isEdit && task && (
            <div className={styles.next}>
              {task.isNextAction ? (
                <Badge tone="info" icon={<Target size={14} strokeWidth={1.75} />}>Next action</Badge>
              ) : (
                <Button variant="secondary" size="sm" disabled={task.status === "done"} onClick={onSetNextAction}>
                  Set as next action
                </Button>
              )}
              {task.status === "done" && !task.isNextAction && <span className={styles.note}>Done tasks cannot be the next action.</span>}
            </div>
          )}
          {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
        </form>
      </SidePanel>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title={`Delete "${task?.title ?? "this task"}"?`}
        description="The task is removed from the board and from every list it appears in. This cannot be undone."
        confirmLabel="Delete task"
        onConfirm={() => { onDelete(); onClose(); }}
      />
    </>
  );
}
