import { describe, it, expect } from "vitest";
import {
  QUESTION_FILTERS,
  DEFAULT_QUESTION_FILTER,
  parseQuestionFilter,
  isBlockingOpen,
  countQuestions,
  filterQuestions,
  sortQuestions,
  formatBlockingLine,
  questionStatusLabel,
} from "./questions.js";

const q = (id, overrides = {}) => ({
  id,
  question: `Question ${id}`,
  status: "open",
  blocking: false,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-01T09:00:00.000Z",
  ...overrides,
});

const sample = [
  q("a", { blocking: true }),
  q("b"),
  q("c", { status: "answered", blocking: true, updatedAt: "2026-10-05T09:00:00.000Z" }),
  q("d", { status: "answered", updatedAt: "2026-10-07T09:00:00.000Z" }),
];

describe("filters", () => {
  it("defaults to open and lists Open, Answered, All", () => {
    expect(DEFAULT_QUESTION_FILTER).toBe("open");
    expect(QUESTION_FILTERS.map((f) => f.label)).toEqual(["Open", "Answered", "All"]);
  });

  it("parses valid filters and rejects the rest", () => {
    expect(parseQuestionFilter("answered")).toBe("answered");
    expect(parseQuestionFilter("all")).toBe("all");
    expect(parseQuestionFilter("blocking")).toBeNull();
    expect(parseQuestionFilter(undefined)).toBeNull();
  });

  it("filters open, answered and all", () => {
    expect(filterQuestions(sample, "open").map((x) => x.id)).toEqual(["a", "b"]);
    expect(filterQuestions(sample, "answered").map((x) => x.id)).toEqual(["c", "d"]);
    expect(filterQuestions(sample, "all")).toHaveLength(4);
  });

  it("treats an unknown filter as open and a non-array as empty", () => {
    expect(filterQuestions(sample, "nonsense").map((x) => x.id)).toEqual(["a", "b"]);
    expect(filterQuestions(undefined, "open")).toEqual([]);
  });
});

describe("counts", () => {
  it("counts open, answered, all and blocking (open only)", () => {
    expect(countQuestions(sample)).toEqual({ open: 2, answered: 2, all: 4, blocking: 1 });
  });

  it("is zero for no questions", () => {
    expect(countQuestions([])).toEqual({ open: 0, answered: 0, all: 0, blocking: 0 });
    expect(countQuestions(null)).toEqual({ open: 0, answered: 0, all: 0, blocking: 0 });
  });

  it("an answered blocking question no longer blocks", () => {
    expect(isBlockingOpen(sample[2])).toBe(false);
    expect(isBlockingOpen(sample[0])).toBe(true);
  });
});

describe("sortQuestions", () => {
  it("puts blocking first, then open, then answered", () => {
    expect(sortQuestions(sample).map((x) => x.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("orders open questions newest first", () => {
    const list = [q("old", { createdAt: "2026-09-01T00:00:00.000Z" }), q("new", { createdAt: "2026-10-01T00:00:00.000Z" })];
    expect(sortQuestions(list).map((x) => x.id)).toEqual(["new", "old"]);
  });

  it("is stable when nothing separates two questions and does not mutate the input", () => {
    const list = [q("x", { createdAt: undefined }), q("y", { createdAt: undefined })];
    const copy = [...list];
    expect(sortQuestions(list).map((x) => x.id)).toEqual(["x", "y"]);
    expect(list).toEqual(copy);
  });
});

describe("labels", () => {
  it("formats the blocking line", () => {
    expect(formatBlockingLine(0)).toBeNull();
    expect(formatBlockingLine(undefined)).toBeNull();
    expect(formatBlockingLine(1)).toBe("1 blocking question");
    expect(formatBlockingLine(2)).toBe("2 blocking questions");
  });

  it("labels the status in words", () => {
    expect(questionStatusLabel(q("a"))).toBe("Open");
    expect(questionStatusLabel(q("a", { status: "answered" }))).toBe("Answered");
  });
});
