// Pure helpers for the Record tab's questions: filter, count, order.
// Questions come from the normalized project (status is "open" or "answered").

export const QUESTION_FILTERS = [
  { value: "open", label: "Open" },
  { value: "blocking", label: "Blocking" },
  { value: "answered", label: "Answered" },
];
export const DEFAULT_QUESTION_FILTER = "open";

const FILTER_VALUES = QUESTION_FILTERS.map((f) => f.value);

export const QUESTION_EMPTY_COPY = {
  open: { title: "No open questions", description: "Everything has an answer, or nothing has been asked yet." },
  blocking: { title: "Nothing is blocking", description: "No open question is holding up progress." },
  answered: { title: "No answered questions yet", description: "Answers show up here once you record them." },
};

/** A navigation param (`{ q: "answered" }`) or stored value to a valid filter, or null. */
export const parseQuestionFilter = (value) => (FILTER_VALUES.includes(value) ? value : null);

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const isAnswered = (question) => question?.status === "answered";

/** Only an open question blocks anything; an answered one has stopped. */
export const isBlockingOpen = (question) => Boolean(question?.blocking) && !isAnswered(question);

export const filterQuestions = (questions, filter) => {
  const list = asList(questions);
  if (filter === "answered") return list.filter(isAnswered);
  if (filter === "blocking") return list.filter(isBlockingOpen);
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

export const questionStatusLabel = (question) => (isAnswered(question) ? "Answered" : "Open");
