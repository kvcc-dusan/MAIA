import React, { useMemo, useRef } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { SectionCard } from "@/components/composed/SectionCard";
import { CountPill } from "@/components/composed/SectionBits";
import { EmptyState } from "@/components/composed/EmptyState";
import { countQuestions, filterQuestions, sortQuestions, QUESTION_FILTERS } from "./questions";
import { findWorkstream } from "./workstreams";
import { settleFocus } from "./focus";
import QuestionRow from "./QuestionRow";
import styles from "./record.module.css";

const SECTION = "questions";

const EMPTY_COPY = {
  open: {
    title: "No open questions",
    description: "Everything asked so far has an answer. Add a question when something new is unclear.",
  },
  answered: {
    title: "No answered questions yet",
    description: "Answers show up here once you mark a question as answered.",
  },
};

const withCounts = (counts) =>
  QUESTION_FILTERS.map((option) => ({
    ...option,
    accessory: <CountPill size="sm">{counts[option.value]}</CountPill>,
  }));

/** Questions first: an open blocking question is the thing most likely to need someone today. */
export default function QuestionsSection({
  questions,
  workstreamsById,
  filter,
  onFilterChange,
  onAdd,
  onEdit,
  onDelete,
  onAnswer,
  onReopen,
}) {
  const cardRef = useRef(null);
  const counts = useMemo(() => countQuestions(questions), [questions]);
  const visible = useMemo(() => sortQuestions(filterQuestions(questions, filter)), [questions, filter]);
  const options = useMemo(() => withCounts(counts), [counts]);
  const isEmpty = counts.all === 0;

  // The row may be gone after the change (it left the filter), so focus is settled afterwards.
  const changeThenSettle = (run) => async (id, ...rest) => {
    await run(id, ...rest);
    settleFocus(cardRef.current, SECTION, id);
  };

  return (
    <SectionCard
      ref={cardRef}
      role="region"
      aria-label="Questions"
      data-section={SECTION}
      className={styles.section}
      title="Questions"
      titleAs="h2"
      action={
        isEmpty ? null : (
          <Button onClick={onAdd}>Add question</Button>
        )
      }
    >
      {isEmpty ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No questions yet"
          description="Questions capture what is still unknown so work does not stall on a guess. Add the first one."
          action={<Button onClick={onAdd}>Add question</Button>}
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <SegmentedControl
              label="Question status"
              options={options}
              value={filter}
              onValueChange={onFilterChange}
            />
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={MessageCircleQuestion}
              title={EMPTY_COPY[filter]?.title ?? "No questions"}
              description={EMPTY_COPY[filter]?.description ?? "Nothing matches this filter."}
            />
          ) : (
            <ul className={styles.list} role="list">
              {visible.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  workstream={findWorkstream(workstreamsById, question.workstreamId)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAnswer={changeThenSettle(onAnswer)}
                  onReopen={changeThenSettle(onReopen)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </SectionCard>
  );
}
