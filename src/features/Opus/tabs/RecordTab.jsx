import React, { useMemo, useRef, useState } from "react";
import { useData } from "@/context/DataContext";
import { SidePanel } from "@/components/composed/SidePanel";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { useOpusNav } from "../OpusNavContext";
import { toDayString } from "../lib/metrics";
import QuestionsSection from "../components/record/QuestionsSection";
import DecisionsSection from "../components/record/DecisionsSection";
import QuestionForm from "../components/record/QuestionForm";
import DecisionForm from "../components/record/DecisionForm";
import { countQuestions, formatBlockingLine, parseQuestionFilter, DEFAULT_QUESTION_FILTER } from "../components/record/questions";
import { indexWorkstreams } from "../components/record/workstreams";
import { focusSectionHeading } from "../components/record/focus";
import { clipText } from "../components/record/text";
import styles from "./RecordTab.module.css";

const asList = (value) => (Array.isArray(value) ? value : []);

const CLOSED_EDITOR = { isOpen: false, kind: null, id: null, nonce: 0, today: "" };
const CLOSED_CONFIRM = { isOpen: false, kind: null, id: null, label: "" };

const PANEL_COPY = {
  question: { new: "New question", edit: "Edit question", hint: "Questions stay open until someone answers them." },
  decision: { new: "New decision", edit: "Edit decision", hint: "Decisions are kept in date order for the whole project." },
};

const DELETE_COPY = {
  question: { title: "Delete this question?", confirm: "Delete question" },
  decision: { title: "Delete this decision?", confirm: "Delete decision" },
};

const SECTION_OF = { question: "questions", decision: "decisions" };

/**
 * Record tab: the project's open questions and its decision log.
 *
 * Questions come first because a blocking one needs someone today. Rows hold
 * the quick actions (answer, reopen, delete); the longer edit happens in a side
 * panel. `params.q` ("open", "answered" or "all") preselects the question filter.
 */
export default function RecordTab({ project }) {
  const {
    addQuestion, updateQuestion, deleteQuestion, answerQuestion,
    addDecision, updateDecision, deleteProjectDecision,
  } = useData();
  const { params } = useOpusNav();

  const rootRef = useRef(null);
  const [filter, setFilter] = useState(() => parseQuestionFilter(params?.q) ?? DEFAULT_QUESTION_FILTER);
  const [seenParams, setSeenParams] = useState(params);
  const [editor, setEditor] = useState(CLOSED_EDITOR);
  const [confirm, setConfirm] = useState(CLOSED_CONFIRM);
  // Set when the control that opened a dialog or panel is about to disappear.
  const refocusRef = useRef(null);
  const [today] = useState(() => toDayString(new Date()));

  // A navigation that arrives while this tab is mounted re-seeds the filter.
  if (seenParams !== params) {
    setSeenParams(params);
    const requested = parseQuestionFilter(params?.q);
    if (requested) setFilter(requested);
  }

  const questions = asList(project?.questions);
  const decisions = asList(project?.decisions);
  const workstreams = asList(project?.workstreams);
  const workstreamsById = useMemo(() => indexWorkstreams(workstreams), [workstreams]);
  const blockingLine = formatBlockingLine(countQuestions(questions).blocking);
  const projectId = project?.id;

  const openEditor = (kind, id = null) =>
    setEditor((current) => ({ isOpen: true, kind, id, nonce: current.nonce + 1, today: toDayString(new Date()) }));
  const closeEditor = () => setEditor((current) => ({ ...current, isOpen: false }));

  const editedItem = editor.id
    ? asList(editor.kind === "question" ? questions : decisions).find((item) => item.id === editor.id)
    : null;
  // An id that no longer resolves (deleted elsewhere) has nothing to edit.
  const canRenderForm = editor.kind && (!editor.id || editedItem);

  const saveQuestion = async (patch) => {
    if (editor.id) {
      updateQuestion(projectId, editor.id, patch);
    } else {
      if (!addQuestion(projectId, patch)) throw new Error("Project not found");
      // A new question is open, so make sure the list can show it.
      setFilter("open");
      if (questions.length === 0) refocusRef.current = "questions";
    }
    closeEditor();
  };

  const saveDecision = async (data) => {
    if (editor.id) {
      updateDecision(projectId, editor.id, data);
    } else {
      if (!addDecision(projectId, data)) throw new Error("Project not found");
      if (decisions.length === 0) refocusRef.current = "decisions";
    }
    closeEditor();
  };

  const requestDelete = (kind) => (item) =>
    setConfirm({ isOpen: true, kind, id: item.id, label: clipText(kind === "question" ? item.question : item.title, 80) });

  const confirmDelete = async () => {
    if (confirm.kind === "question") deleteQuestion(projectId, confirm.id);
    else deleteProjectDecision(projectId, confirm.id);
    refocusRef.current = SECTION_OF[confirm.kind];
  };

  // Radix would hand focus to a button that has just been removed; send it to the section instead.
  const handleDialogCloseFocus = (event) => {
    if (!refocusRef.current) return;
    event.preventDefault();
    focusSectionHeading(rootRef.current, refocusRef.current);
    refocusRef.current = null;
  };

  const panelCopy = PANEL_COPY[editor.kind];

  return (
    <div className={styles.root} ref={rootRef}>
      {blockingLine && <p className={styles.blocking}>{blockingLine}</p>}

      <QuestionsSection
        questions={questions}
        workstreamsById={workstreamsById}
        filter={filter}
        onFilterChange={setFilter}
        onAdd={() => openEditor("question")}
        onEdit={(id) => openEditor("question", id)}
        onDelete={requestDelete("question")}
        onAnswer={async (id, answer) => answerQuestion(projectId, id, answer)}
        onReopen={async (id) => updateQuestion(projectId, id, { status: "open" })}
      />

      <DecisionsSection
        decisions={decisions}
        workstreamsById={workstreamsById}
        today={today}
        onAdd={() => openEditor("decision")}
        onEdit={(id) => openEditor("decision", id)}
        onDelete={requestDelete("decision")}
      />

      <SidePanel
        open={editor.isOpen}
        onClose={closeEditor}
        title={panelCopy ? (editor.id ? panelCopy.edit : panelCopy.new) : "Edit record"}
        description={panelCopy?.hint}
        onCloseAutoFocus={handleDialogCloseFocus}
      >
        {canRenderForm && editor.kind === "question" && (
          <QuestionForm
            key={editor.nonce}
            question={editedItem}
            workstreams={workstreams}
            onSave={saveQuestion}
            onCancel={closeEditor}
          />
        )}
        {canRenderForm && editor.kind === "decision" && (
          <DecisionForm
            key={editor.nonce}
            decision={editedItem}
            workstreams={workstreams}
            today={editor.today || today}
            onSave={saveDecision}
            onCancel={closeEditor}
          />
        )}
      </SidePanel>

      <ConfirmDialog
        open={confirm.isOpen}
        onClose={() => setConfirm((current) => ({ ...current, isOpen: false }))}
        onConfirm={confirmDelete}
        title={DELETE_COPY[confirm.kind]?.title ?? "Delete this item?"}
        description={`"${confirm.label}" is removed from the project record. This can't be undone.`}
        confirmLabel={DELETE_COPY[confirm.kind]?.confirm ?? "Delete"}
        onCloseAutoFocus={handleDialogCloseFocus}
      />
    </div>
  );
}
