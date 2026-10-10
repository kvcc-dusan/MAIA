import React, { useRef, useState } from "react";
import { EntityForm } from "@/components/composed/EntityForm";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import {
  emptyDecisionDraft,
  decisionToDraft,
  decisionDraftToData,
  validateDecisionDraft,
  dayToFieldValue,
  fieldValueToDay,
} from "./drafts";
import { workstreamOptions } from "./workstreams";
import styles from "./RecordForms.module.css";

const SAVE_ERROR = "Couldn't save this decision. Try again.";

/**
 * Side-panel form for a decision. A new one starts dated today (`today` is a
 * local "YYYY-MM-DD" from the caller, so the form stays pure).
 *
 * `onSave(data)` returns a promise; a rejection keeps the panel open with an
 * error, success is up to the caller (it closes the panel).
 */
export default function DecisionForm({ decision, workstreams, today, onSave, onCancel }) {
  const isEditing = Boolean(decision);
  const [draft, setDraft] = useState(() => (decision ? decisionToDraft(decision) : emptyDecisionDraft(today)));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const isSavingRef = useRef(false);
  const titleRef = useRef(null);
  const options = workstreamOptions(workstreams);

  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const handleSubmit = async () => {
    if (isSavingRef.current) return;
    const found = validateDecisionDraft(draft);
    setErrors(found);
    if (found.title) return titleRef.current?.focus();

    isSavingRef.current = true;
    setSaveError("");
    try {
      await onSave(decisionDraftToData(draft));
    } catch (failure) {
      console.error("DecisionForm: save failed", failure);
      setSaveError(SAVE_ERROR);
    } finally {
      isSavingRef.current = false;
    }
  };

  return (
    <EntityForm
      inPanel
      title={isEditing ? "Edit decision" : "New decision"}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Add decision"}
    >
      <Input
        ref={titleRef}
        autoFocus
        label="Title"
        placeholder="What was decided?"
        aria-required="true"
        value={draft.title}
        error={errors.title}
        onChange={(event) => change("title", event.target.value)}
      />

      <DateTimeField
        label="Date"
        dateOnly
        value={dayToFieldValue(draft.date)}
        onChange={(value) => change("date", fieldValueToDay(value))}
      />

      <Input
        label="Decided by"
        placeholder="Who made the call?"
        value={draft.by}
        onChange={(event) => change("by", event.target.value)}
      />

      {options.length > 0 && (
        <Select
          label="Workstream"
          value={draft.workstreamId}
          options={options}
          onChange={(value) => change("workstreamId", value)}
          placeholder="None"
          clearLabel="None"
        />
      )}

      <Textarea
        label="Detail"
        placeholder="Why this, and what was ruled out?"
        rows={4}
        value={draft.detail}
        onChange={(event) => change("detail", event.target.value)}
      />

      {saveError && <p role="alert" className={styles.saveError}>{saveError}</p>}
    </EntityForm>
  );
}
