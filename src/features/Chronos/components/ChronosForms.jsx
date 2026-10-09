import { useId } from "react";
import { EntityForm } from "@/components/composed/EntityForm";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Folder01 as FolderIcon } from "@/components/ui/CustomIcon.jsx";
import { TASK_PRIORITIES, SIGNAL_PRIORITIES, IN_PRESETS } from "../../../lib/constants";
import { toLocalInputValue } from "../../../lib/time";
import { SessionColorSwatches } from "./SessionColorSwatches";
import styles from "../ChronosModal.module.css";

const TIME_MODES = [
  { value: "in", label: "In" },
  { value: "at", label: "At" },
];

/**
 * The three Chronos forms. Each is presentational: the draft and its setter
 * live in ChronosModal, which also owns validation and saving.
 */
export function TaskForm({ draft, setDraft, error, onCancel, onSubmit }) {
  return (
    <EntityForm
      title={draft.id ? "Edit task" : "New task"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      submitLabel={draft.id ? "Save changes" : "Create task"}
    >
      <Input
        autoFocus
        label="Title"
        placeholder="What needs to be done?"
        aria-required="true"
        error={error || undefined}
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
      />

      <Select
        label="Priority"
        value={draft.priority}
        options={TASK_PRIORITIES}
        onChange={(val) => setDraft((d) => ({ ...d, priority: val }))}
      />

      <DateTimeField
        label="Deadline"
        value={draft.due}
        dateOnly
        onChange={(val) => setDraft((d) => ({ ...d, due: val }))}
      />

      <Textarea
        label="Description"
        placeholder="Add details"
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
      />
    </EntityForm>
  );
}

export function SignalForm({ draft, setDraft, error, onCancel, onSubmit, onPresetChange }) {
  const timeLabelId = useId();

  return (
    <EntityForm
      title={draft.id ? "Edit signal" : "New signal"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      submitLabel={draft.id ? "Save changes" : "Create signal"}
    >
      <Input
        autoFocus
        label="Title"
        placeholder="Signal name"
        aria-required="true"
        error={error || undefined}
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
      />

      <div className={styles.fieldGroup} role="group" aria-labelledby={timeLabelId}>
        <span id={timeLabelId} className={styles.fieldLabel}>Time</span>
        <div className={styles.timeRow}>
          <SegmentedControl
            label="Time mode"
            options={TIME_MODES}
            value={draft.mode}
            onValueChange={(mode) => setDraft((d) => ({ ...d, mode }))}
          />

          {draft.mode === "in" ? (
            <Select value={draft.minutes} options={IN_PRESETS} onChange={onPresetChange} placeholder="Duration" />
          ) : (
            <DateTimeField value={draft.at} onChange={(val) => setDraft((d) => ({ ...d, at: val }))} />
          )}
        </div>
      </div>

      <Select
        label="Priority"
        value={draft.priority}
        options={SIGNAL_PRIORITIES}
        onChange={(val) => setDraft((d) => ({ ...d, priority: val }))}
      />

      <Textarea
        label="Description"
        placeholder="Signal details"
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
      />
    </EntityForm>
  );
}

export function SessionForm({ draft, setDraft, error, projectOptions, onCancel, onSubmit }) {
  const colourLabelId = useId();

  return (
    <EntityForm
      title={draft.id ? "Edit session" : "New session"}
      onCancel={onCancel}
      onSubmit={onSubmit}
      submitLabel={draft.id ? "Save changes" : "Create session"}
    >
      <Input
        autoFocus
        label="Title"
        placeholder="Deep work session"
        aria-required="true"
        error={error || undefined}
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
      />

      <div className={styles.fieldGroup} role="group" aria-labelledby={colourLabelId}>
        <span id={colourLabelId} className={styles.fieldLabel}>Colour</span>
        <SessionColorSwatches value={draft.color} onChange={(color) => setDraft((d) => ({ ...d, color }))} />
      </div>

      <DateTimeField
        label="Start"
        value={draft.start ? toLocalInputValue(draft.start) : ""}
        onChange={(val) => setDraft((d) => ({ ...d, start: new Date(val) }))}
      />

      <DateTimeField
        label="End"
        value={draft.end ? toLocalInputValue(draft.end) : ""}
        onChange={(val) => setDraft((d) => ({ ...d, end: new Date(val) }))}
      />

      <Select
        label="Project"
        icon={FolderIcon}
        value={draft.linkedProjectId === "none" ? null : draft.linkedProjectId}
        options={projectOptions}
        placeholder="Link a project"
        clearLabel="No project"
        onChange={(val) => setDraft((d) => ({ ...d, linkedProjectId: val || "none" }))}
      />

      <Textarea
        label="Description"
        placeholder="What will you work on"
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
      />
    </EntityForm>
  );
}
