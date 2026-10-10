// Pure helpers for the Record tab's questions: filter, count, order.
// Questions come from the normalized project (status is "open" or "answered").

export const QUESTION_FILTERS = [
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "all", label: "All" },
];
export const DEFAULT_QUESTION_FILTER = "open";

const FILTER_VALUES = QUESTION_FILTERS.map((f) => f.value);

/** A navigation param (`{ q: "answered" }`) or stored value to a valid filter, or null. */
export const parseQuestionFilter = (value) => (FILTER_VALUES.includes(value) ? value : null);

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const isAnswered = (question) => question?.status === "answered";

/** Only an open question blocks anything; an answered one has stopped. */
export const isBlockingOpen = (question) => Boolean(question?.blocking) && !isAnswered(question);

export const countQuestions = (questions) => {
  const list = asList(questions);
  const answered = list.filter(isAnswered).length;
  return {
    open: list.length - answered,
    answered,
    all: list.length,
    blocking: list.filter(isBlockingOpen).length,
  };
};

export const filterQuestions = (questions, filter) => {
  const list = asList(questions);
  if (filter === "answered") return list.filter(isAnswered);
  if (filter === "all") return list;
  return list.filter((q) => !isAnswered(q));
};

// Blocking first, then the rest of the open ones, answered last. Inside a group
// the most recent comes first: when it was asked (open) or answered (answered).
const groupRank = (q) => (isBlockingOpen(q) ? 0 : isAnswered(q) ? 2 : 1);
const recency = (q) => String((isAnswered(q) ? q.updatedAt ?? q.createdAt : q.createdAt) ?? "");

export const sortQuestions = (questions) =>
  asList(questions)
    .map((q, index) => ({ q, index }))
    .sort((a, b) => groupRank(a.q) - groupRank(b.q) || recency(b.q).localeCompare(recency(a.q)) || a.index - b.index)
    .map(({ q }) => q);

/** "2 blocking questions", or null when nothing blocks (the line is then not shown). */
export const formatBlockingLine = (count) => {
  if (!count || count < 1) return null;
  return count === 1 ? "1 blocking question" : `${count} blocking questions`;
};

export const questionStatusLabel = (question) => (isAnswered(question) ? "Answered" : "Open");
