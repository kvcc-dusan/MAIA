import React, { useId, useRef, useState } from "react";
import { EntityForm } from "@/components/composed/EntityForm";
import { Select } from "@/components/composed/Select";
import { Button } from "@/components/arc/button/button";
import StatusBadge from "../../kit/StatusBadge";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { Switch } from "@/components/arc/switch/switch";
import { emptyQuestionDraft, questionToDraft, questionDraftToPatch, validateQuestionDraft } from "./drafts";
import { workstreamOptions } from "./workstreams";
import styles from "./RecordForms.module.css";

const SAVE_ERROR = "Couldn't save this question. Try again.";

/**
 * Side-panel form for a question. Save changes keeps the status; Mark answered
 * (needs an answer) and Reopen change it together with the other fields.
 *
 * `onSave(patch)` returns a promise; a rejection keeps the panel open with an
 * error, success is up to the caller (it closes the panel).
 */
export default function QuestionForm({ question, workstreams, onSave, onCancel, onDelete }) {
  const isEditing = Boolean(question);
  const [draft, setDraft] = useState(() => (question ? questionToDraft(question) : emptyQuestionDraft()));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const isSavingRef = useRef(false);
  const questionRef = useRef(null);
  const answerRef = useRef(null);
  const blockingLabelId = useId();
  const blockingHintId = useId();
  const options = workstreamOptions(workstreams);

  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const isAnswered = draft.status === "answered";

  // `status` overrides the draft's, so one handler serves Save, Mark answered and Reopen.
  const submitAs = async (status) => {
    if (isSavingRef.current) return;
    const next = { ...draft, status };
    const found = validateQuestionDraft(next);
    setErrors(found);
    if (found.question) return questionRef.current?.focus();
    if (found.answer) return answerRef.current?.focus();

    isSavingRef.current = true;
    setSaveError("");
    try {
      await onSave({ ...questionDraftToPatch(next), status });
    } catch (failure) {
      console.error("QuestionForm: save failed", failure);
      setSaveError(SAVE_ERROR);
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleSubmit = () => submitAs(draft.status);

  return (
    <EntityForm
      inPanel
      title={isEditing ? "Edit question" : "New question"}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Add question"}
    >
      {isEditing && (
        <div className={styles.statusRow}>
          <span className={styles.switchLabel}>Status</span>
          <StatusBadge status={draft.status} />
        </div>
      )}

      <Textarea
        ref={questionRef}
        autoFocus
        label="Question"
        placeholder="What is still unknown?"
        rows={3}
        aria-required="true"
        value={draft.question}
        error={errors.question}
        onChange={(event) => change("question", event.target.value)}
      />

      <Input
        label="Owner"
        placeholder="Who needs to answer this?"
        value={draft.owner}
        onChange={(event) => change("owner", event.target.value)}
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

      <div className={styles.switchRow}>
        <div className={styles.switchText}>
          <span id={blockingLabelId} className={styles.switchLabel}>Blocking</span>
          <span id={blockingHintId} className={styles.switchHint}>
            Work is held up until this question is answered.
          </span>
        </div>
        <Switch
          checked={draft.blocking}
          onCheckedChange={(checked) => change("blocking", checked)}
          aria-labelledby={blockingLabelId}
          aria-describedby={blockingHintId}
        />
      </div>

      {isEditing && (
        <Textarea
          ref={answerRef}
          label="Answer"
          placeholder="What was decided or found out?"
          rows={3}
          aria-required={isAnswered || undefined}
          value={draft.answer}
          error={errors.answer}
          onChange={(event) => change("answer", event.target.value)}
        />
      )}

      {saveError && <p role="alert" className={styles.saveError}>{saveError}</p>}

      {isEditing && (
        <div className={styles.dangerRow}>
          {isAnswered ? (
            <Button type="button" variant="secondary" onClick={() => submitAs("open")}>Reopen</Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => submitAs("answered")}>Mark answered</Button>
          )}
          {onDelete && <Button type="button" variant="danger" onClick={onDelete}>Delete question</Button>}
        </div>
      )}
    </EntityForm>
  );
}
