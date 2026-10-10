import { describe, it, expect } from "vitest";
import {
  emptyQuestionDraft,
  questionToDraft,
  validateQuestionDraft,
  questionDraftToPatch,
  validateAnswer,
  emptyDecisionDraft,
  decisionToDraft,
  validateDecisionDraft,
  decisionDraftToData,
  dayToFieldValue,
  fieldValueToDay,
  QUESTION_ERRORS,
  DECISION_ERRORS,
} from "./drafts.js";

describe("question drafts", () => {
  it("starts empty, open and not blocking", () => {
    expect(emptyQuestionDraft()).toEqual({
      question: "", owner: "", workstreamId: null, blocking: false, answer: "", status: "open",
    });
  });

  it("copies an existing question and defaults the missing bits", () => {
    expect(questionToDraft({ question: "Why?", status: "answered", answer: "Because", blocking: true, workstreamId: "w1" })).toEqual({
      question: "Why?", owner: "", workstreamId: "w1", blocking: true, answer: "Because", status: "answered",
    });
    expect(questionToDraft(undefined).status).toBe("open");
  });

  it("requires the question text", () => {
    expect(validateQuestionDraft({ ...emptyQuestionDraft(), question: "   " })).toEqual({ question: QUESTION_ERRORS.question });
    expect(validateQuestionDraft({ ...emptyQuestionDraft(), question: "Ok?" })).toEqual({});
  });

  it("requires an answer only for an answered question", () => {
    const answered = { ...emptyQuestionDraft(), question: "Ok?", status: "answered", answer: " " };
    expect(validateQuestionDraft(answered)).toEqual({ answer: QUESTION_ERRORS.answer });
    expect(validateQuestionDraft({ ...answered, answer: "Yes" })).toEqual({});
    expect(validateQuestionDraft({ ...answered, status: "open" })).toEqual({});
  });

  it("builds a trimmed patch without touching status", () => {
    const patch = questionDraftToPatch({ question: "  Ship?  ", owner: " Ana ", workstreamId: "", blocking: 1, answer: "x", status: "open" });
    expect(patch).toEqual({ question: "Ship?", owner: "Ana", workstreamId: null, blocking: true });
    expect("status" in patch).toBe(false);
    expect("answer" in patch).toBe(false);
  });

  it("includes the answer for an answered question", () => {
    expect(questionDraftToPatch({ ...emptyQuestionDraft(), question: "Q", status: "answered", answer: " Yes " }).answer).toBe("Yes");
  });

  it("validates the inline answer", () => {
    expect(validateAnswer("")).toBe(QUESTION_ERRORS.answer);
    expect(validateAnswer("   ")).toBe(QUESTION_ERRORS.answer);
    expect(validateAnswer("Yes")).toBeNull();
  });
});

describe("decision drafts", () => {
  it("defaults the date to today", () => {
    expect(emptyDecisionDraft("2026-10-09")).toEqual({ title: "", date: "2026-10-09", by: "", workstreamId: null, detail: "" });
  });

  it("copies an existing decision, reducing a timestamp to its day", () => {
    expect(decisionToDraft({ title: "Use SQLite", date: "2026-10-01T10:00:00.000Z", by: "Ana", workstreamId: "w2", detail: "Why" })).toEqual({
      title: "Use SQLite", date: "2026-10-01", by: "Ana", workstreamId: "w2", detail: "Why",
    });
  });

  it("requires a title", () => {
    expect(validateDecisionDraft(emptyDecisionDraft("2026-10-09"))).toEqual({ title: DECISION_ERRORS.title });
    expect(validateDecisionDraft({ ...emptyDecisionDraft("2026-10-09"), title: "Go" })).toEqual({});
  });

  it("builds trimmed writer data", () => {
    expect(
      decisionDraftToData({ title: " Go ", date: "2026-10-09", by: " Ana ", workstreamId: "", detail: " Because " }),
    ).toEqual({ title: "Go", date: "2026-10-09", by: "Ana", workstreamId: null, detail: "Because" });
  });

  it("bridges the date field without a time zone shift", () => {
    expect(dayToFieldValue("2026-10-09")).toBe("2026-10-09T00:00");
    expect(dayToFieldValue("")).toBe("");
    expect(fieldValueToDay("2026-10-09T13:45")).toBe("2026-10-09");
    expect(fieldValueToDay("")).toBe("");
  });
});
