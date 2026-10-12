import React, { useRef, useState } from "react";
import { EntityForm } from "@/components/composed/EntityForm";
import { FormGrid, FormSpan } from "@/components/composed/FormGrid";
import { Select } from "@/components/composed/Select";
import { Input } from "@/components/arc/input/input";
import { DOC_STATUSES } from "../../lib/docModel";
import { emptyDocDraft, kindOptions, noteToDocDraft, validateDocDraft, docDraftToFields } from "./docDisplay";
import styles from "./DocumentForm.module.css";

const SAVE_ERROR = "Couldn't save this document. Try again.";

/**
 * Side-panel form to add or edit a document. `onSave(fields)` may be async; a
 * rejection keeps the panel open with an error, success is up to the caller.
 */
export default function DocumentForm({ note, workstreams = [], onSave, onCancel }) {
  const isEditing = Boolean(note);
  const [draft, setDraft] = useState(() => (note ? noteToDocDraft(note) : emptyDocDraft()));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const isSavingRef = useRef(false);
  const titleRef = useRef(null);

  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const handleSubmit = async () => {
    if (isSavingRef.current) return;
    const found = validateDocDraft(draft);
    setErrors(found);
    if (found.title) return titleRef.current?.focus();
    isSavingRef.current = true;
    setSaveError("");
    try {
      await onSave(docDraftToFields(draft));
    } catch (failure) {
      console.error("DocumentForm: save failed", failure);
      setSaveError(SAVE_ERROR);
    } finally {
      isSavingRef.current = false;
    }
  };

  const workstreamChoices = workstreams.map((w) => ({ value: w.id, label: w.name }));

  return (
    <EntityForm
      inPanel
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Add document"}
    >
      <FormGrid>
        <FormSpan>
          <Input
            ref={titleRef}
            autoFocus
            label="Title"
            placeholder="Launch plan"
            aria-required="true"
            value={draft.title}
            error={errors.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </FormSpan>
        <Select label="Kind" value={draft.kind} options={kindOptions} onChange={(value) => change("kind", value)} />
        <Select
          label="Status"
          value={draft.status}
          options={DOC_STATUSES}
          onChange={(value) => change("status", value)}
        />
        {workstreamChoices.length > 0 && (
          <Select
            label="Workstream"
            value={draft.workstreamId}
            options={workstreamChoices}
            onChange={(value) => change("workstreamId", value)}
            placeholder="None"
            clearLabel="None"
          />
        )}
        <Input
          label="Owner"
          placeholder="Who looks after this?"
          value={draft.owner}
          onChange={(event) => change("owner", event.target.value)}
        />
        {saveError && (
          <FormSpan>
            <p role="alert" className={styles.saveError}>
              {saveError}
            </p>
          </FormSpan>
        )}
      </FormGrid>
    </EntityForm>
  );
}
