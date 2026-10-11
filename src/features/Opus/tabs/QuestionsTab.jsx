import React, { useMemo, useState } from "react";
import { MessageCircleQuestion } from "@/components/icons";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { SidePanel } from "@/components/composed/SidePanel";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PageBar, FilterChips, ListRow, StatusBadge } from "../kit";
import { useOpusNav } from "../OpusNavContext";
import QuestionForm from "../components/record/QuestionForm";
import {
  QUESTION_FILTERS,
  QUESTION_EMPTY_COPY,
  DEFAULT_QUESTION_FILTER,
  parseQuestionFilter,
  filterQuestions,
  sortQuestions,
  isAnswered,
  isBlockingOpen,
} from "../components/record/questions";
import { indexWorkstreams, findWorkstream } from "../components/record/workstreams";
import { clipText } from "../components/record/text";
import styles from "./RecordPage.module.css";

const asList = (value) => (Array.isArray(value) ? value : []);
const CLOSED = { isOpen: false, id: null, nonce: 0 };
const requestedFilter = (params) => parseQuestionFilter(params?.q ?? params?.filter);

/** Questions: Open / Blocking / Answered chips, rows that open an edit panel. */
export default function QuestionsTab({ project }) {
  const { addQuestion, updateQuestion, deleteQuestion } = useData();
  const { params } = useOpusNav();
  const [filter, setFilter] = useState(() => requestedFilter(params) ?? DEFAULT_QUESTION_FILTER);
  const [seenParams, setSeenParams] = useState(params);
  const [editor, setEditor] = useState(CLOSED);
  const [confirm, setConfirm] = useState({ isOpen: false, label: "" });

  // A navigation that lands while this page is mounted re-applies its filter.
  if (seenParams !== params) {
    setSeenParams(params);
    const requested = requestedFilter(params);
    if (requested) setFilter(requested);
  }

  const projectId = project?.id;
  const questions = asList(project?.questions);
  const workstreams = asList(project?.workstreams);
  const byId = useMemo(() => indexWorkstreams(workstreams), [workstreams]);
  const visible = useMemo(() => sortQuestions(filterQuestions(questions, filter)), [questions, filter]);

  const openEditor = (id = null) => setEditor((current) => ({ isOpen: true, id, nonce: current.nonce + 1 }));
  const closeEditor = () => setEditor((current) => ({ ...current, isOpen: false }));
  const edited = editor.id ? questions.find((q) => q.id === editor.id) : null;
  const canRenderForm = !editor.id || edited;

  const save = async (patch) => {
    if (editor.id) updateQuestion(projectId, editor.id, patch);
    else {
      if (!addQuestion(projectId, patch)) throw new Error("Project not found");
      setFilter(patch.blocking ? "blocking" : "open");
    }
    closeEditor();
  };

  const confirmDelete = async () => {
    deleteQuestion(projectId, editor.id);
    setConfirm((current) => ({ ...current, isOpen: false }));
    closeEditor();
  };

  const renderRow = (question) => {
    const workstream = findWorkstream(byId, question.workstreamId);
    const meta = [question.owner, workstream?.name].filter(Boolean).join(" · ");
    const blocks = isBlockingOpen(question);
    return (
      <ListRow
        key={question.id}
        onClick={() => openEditor(question.id)}
        title={<span className={styles.questionText}>{question.question}</span>}
        subtitle={
          <>
            {isAnswered(question) && question.answer ? <span className={styles.answer}>{question.answer}</span> : null}
            {meta || blocks ? (
              <span className={styles.meta}>
                {meta}
                {meta && blocks ? " · " : ""}
                {blocks ? <span className={styles.blocks}>Blocks progress</span> : null}
              </span>
            ) : null}
          </>
        }
        trailing={<StatusBadge status={isAnswered(question) ? "answered" : "open"} />}
      />
    );
  };

  const emptyCopy = QUESTION_EMPTY_COPY[filter] ?? QUESTION_EMPTY_COPY.open;

  return (
    <div className={styles.page}>
      <PageBar action={<Button onClick={() => openEditor()}>New question</Button>}>
        {questions.length > 0 && (
          <FilterChips label="Question status" options={QUESTION_FILTERS} value={filter} onValueChange={setFilter} />
        )}
      </PageBar>

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No questions yet"
          description="Questions capture what is still unknown. Add the first one."
          action={<Button variant="secondary" onClick={() => openEditor()}>New question</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={MessageCircleQuestion} title={emptyCopy.title} description={emptyCopy.description} />
      ) : (
        <div className={styles.card}>{visible.map(renderRow)}</div>
      )}

      <SidePanel
        open={editor.isOpen}
        onClose={closeEditor}
        title={editor.id ? "Edit question" : "New question"}
        description="Questions stay open until someone answers them."
      >
        {canRenderForm && (
          <QuestionForm
            key={editor.nonce}
            question={edited}
            workstreams={workstreams}
            onSave={save}
            onCancel={closeEditor}
            onDelete={() => setConfirm({ isOpen: true, label: clipText(edited?.question, 80) })}
          />
        )}
      </SidePanel>

      <ConfirmDialog
        open={confirm.isOpen}
        onClose={() => setConfirm((current) => ({ ...current, isOpen: false }))}
        onConfirm={confirmDelete}
        title="Delete this question?"
        description={`"${confirm.label}" is removed from the project. This can't be undone.`}
        confirmLabel="Delete question"
      />
    </div>
  );
}
