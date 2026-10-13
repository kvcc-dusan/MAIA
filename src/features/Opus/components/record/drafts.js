// Form drafts for the question and decision editors: initial values, the
// bridge to the date field, validation and the payload handed to the writers.
import { dayOf } from "./decisions.js";

const text = (value) => String(value ?? "").trim();

/* questions */

export const emptyQuestionDraft = () => ({
  question: "",
  owner: "",
  workstreamId: null,
  blocking: false,
  answer: "",
  status: "open",
});

export const questionToDraft = (question) => ({
  question: question?.question ?? "",
  owner: question?.owner ?? "",
  workstreamId: question?.workstreamId ?? null,
  blocking: Boolean(question?.blocking),
  answer: question?.answer ?? "",
  status: question?.status === "answered" ? "answered" : "open",
});

export const QUESTION_ERRORS = {
  question: "Enter the question you need answered.",
  answer: "Enter the answer, or reopen the question instead.",
};

/** Field errors keyed by field name; an empty object means the draft can be saved. */
export const validateQuestionDraft = (draft) => {
  const errors = {};
  if (!text(draft?.question)) errors.question = QUESTION_ERRORS.question;
  if (draft?.status === "answered" && !text(draft?.answer)) errors.answer = QUESTION_ERRORS.answer;
  return errors;
};

/**
 * Fields the editor may change. Status is not among them: Mark answered and
 * Reopen in the panel set it on their own.
 */
export const questionDraftToPatch = (draft) => ({
  question: text(draft.question),
  owner: text(draft.owner),
  workstreamId: draft.workstreamId || null,
  blocking: Boolean(draft.blocking),
  answer: text(draft.answer),
});

/* decisions */

export const emptyDecisionDraft = (today) => ({
  title: "",
  date: dayOf(today),
  by: "",
  workstreamId: null,
  detail: "",
});

export const decisionToDraft = (decision) => ({
  title: decision?.title ?? "",
  date: dayOf(decision?.date),
  by: decision?.by ?? "",
  workstreamId: decision?.workstreamId ?? null,
  detail: decision?.detail ?? "",
});

export const DECISION_ERRORS = {
  title: "Enter a title so the decision can be found later.",
};

export const validateDecisionDraft = (draft) => {
  const errors = {};
  if (!text(draft?.title)) errors.title = DECISION_ERRORS.title;
  return errors;
};

export const decisionDraftToData = (draft) => ({
  title: text(draft.title),
  date: dayOf(draft.date),
  by: text(draft.by),
  workstreamId: draft.workstreamId || null,
  detail: text(draft.detail),
});

/**
 * DateTimeField speaks local "YYYY-MM-DDTHH:mm". Anchoring the day at local
 * midnight keeps it from shifting a day in time zones behind UTC.
 */
export const dayToFieldValue = (day) => (dayOf(day) ? `${dayOf(day)}T00:00` : "");
export const fieldValueToDay = (value) => dayOf(value);
