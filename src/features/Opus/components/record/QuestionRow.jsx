import React, { useRef, useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Badge } from "@/components/arc/badge/badge";
import { Textarea } from "@/components/arc/textarea/textarea";
import { isAnswered, isBlockingOpen, questionStatusLabel } from "./questions";
import { validateAnswer } from "./drafts";
import { clipText } from "./text";
import WorkstreamTag from "./WorkstreamTag";
import styles from "./record.module.css";

const ANSWER_SAVE_ERROR = "Couldn't save the answer. Try again.";

/**
 * One question. "Mark answered" opens the answer field inside the row so the
 * answer is written where the question is read; everything else (owner,
 * workstream, blocking) is edited in the side panel.
 */
export default function QuestionRow({ question, workstream, onEdit, onDelete, onAnswer, onReopen }) {
  const [isAnswering, setIsAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const triggerRef = useRef(null);

  const answered = isAnswered(question);
  const blocking = isBlockingOpen(question);
  const name = clipText(question.question, 48);

  const startAnswering = () => {
    setAnswer(question.answer ?? "");
    setError("");
    setIsAnswering(true);
  };

  const stopAnswering = () => {
    setIsAnswering(false);
    // The trigger stays mounted, so focus can go straight back to it.
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const submitAnswer = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    const invalid = validateAnswer(answer);
    if (invalid) {
      setError(invalid);
      return;
    }
    setIsSaving(true);
    try {
      await onAnswer(question.id, answer.trim());
      setIsAnswering(false);
    } catch (failure) {
      console.error("QuestionRow: answering failed", failure);
      setError(ANSWER_SAVE_ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    stopAnswering();
  };

  return (
    <li className={styles.row} data-row-id={question.id}>
      <div className={styles.main}>
        <p className={styles.title}>{question.question}</p>
        <div className={styles.meta}>
          <Badge tone={answered ? "success" : "neutral"} size="sm">{questionStatusLabel(question)}</Badge>
          {blocking && <Badge tone="danger" size="sm">Blocking</Badge>}
          <span>{question.owner ? `Owner: ${question.owner}` : "No owner"}</span>
          <WorkstreamTag workstream={workstream} />
        </div>

        {answered && !isAnswering && (
          <div className={styles.answer}>
            <span className={styles.answerLabel}>Answer</span>
            <p className={question.answer ? styles.answerText : styles.answerMissing}>
              {question.answer || "No answer recorded."}
            </p>
          </div>
        )}

        {isAnswering && (
          <form className={styles.answerForm} onSubmit={submitAnswer} onKeyDown={handleKeyDown} noValidate>
            <Textarea
              autoFocus
              label="Answer"
              placeholder="What was decided or found out?"
              rows={3}
              aria-required="true"
              value={answer}
              error={error || undefined}
              onChange={(event) => {
                setAnswer(event.target.value);
                if (error) setError("");
              }}
            />
            <div className={styles.actions}>
              <Button type="submit" variant="secondary" size="sm" loading={isSaving} className={styles.action}>
                Save answer
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={stopAnswering} className={styles.action}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className={styles.actions}>
        {answered ? (
          <Button
            variant="ghost"
            size="sm"
            data-primary-action=""
            className={styles.action}
            aria-label={`Reopen question: ${name}`}
            onClick={() => onReopen(question.id)}
          >
            Reopen
          </Button>
        ) : (
          <Button
            ref={triggerRef}
            variant="ghost"
            size="sm"
            data-primary-action=""
            className={styles.action}
            aria-label={`Mark answered: ${name}`}
            aria-expanded={isAnswering}
            onClick={isAnswering ? stopAnswering : startAnswering}
          >
            Mark answered
          </Button>
        )}
        <Button variant="ghost" size="sm" className={styles.action} aria-label={`Edit question: ${name}`} onClick={() => onEdit(question.id)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" className={styles.action} aria-label={`Delete question: ${name}`} onClick={() => onDelete(question)}>
          Delete
        </Button>
      </div>
    </li>
  );
}
