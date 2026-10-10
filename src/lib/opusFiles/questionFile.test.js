import { describe, it, expect } from "vitest";
import { fromFile, toFile } from "./questionFile.js";

const ctx = { workstreams: [{ id: "w1", name: "Build" }], milestones: [] };
const QUESTION = `---
id: q1
question: Which auth provider?
status: answered
blocking: true
owner: Ana
workstream: Build
createdAt: 2026-10-01T08:00:00.000Z
updatedAt: 2026-10-02T08:00:00.000Z
---

Clerk.
`;

describe("questionFile", () => {
  it("reads keys, with the body as the answer", () => {
    const { item, warnings } = fromFile(QUESTION, { fallbackId: "fb", projectContext: ctx });
    expect(warnings).toEqual([]);
    expect(item).toMatchObject({
      id: "q1", question: "Which auth provider?", status: "answered", blocking: true, owner: "Ana",
      workstreamId: "w1", answer: "Clerk.",
    });
  });

  it("round-trips untouched and CRLF files", () => {
    const { item } = fromFile(QUESTION, { fallbackId: "fb", projectContext: ctx });
    expect(toFile(item, ctx, { source: QUESTION })).toBe(QUESTION);
    const crlf = QUESTION.replace(/\n/g, "\r\n");
    const parsed = fromFile(crlf, { fallbackId: "fb", projectContext: ctx });
    expect(toFile(parsed.item, ctx, { source: crlf })).toBe(QUESTION);
  });

  it("defaults status to open and survives a bad status", () => {
    const { item, warnings } = fromFile("---\nid: q2\nquestion: Why?\nstatus: maybe\n---\n", { fallbackId: "fb" });
    expect(item.status).toBe("open");
    expect(warnings).toHaveLength(1);
  });

  it("uses the filename when the question key is missing", () => {
    const { item } = fromFile("---\nid: q3\n---\nbody", { fallbackId: "fb", fallbackTitle: "Hand written" });
    expect(item.question).toBe("Hand written");
  });

  it("keeps unknown keys when the answer is edited", () => {
    const text = "---\nid: q4\nquestion: Q\nstatus: open\nextra-key: 1\n---\n";
    const { item } = fromFile(text, { fallbackId: "fb" });
    const out = toFile({ ...item, status: "answered", answer: "Done" }, { workstreams: [], milestones: [] }, { source: text });
    expect(out).toContain("extra-key: 1");
    expect(out).toContain("status: answered");
    expect(out.endsWith("---\n\nDone\n")).toBe(true);
  });

  it("returns ok:false for bad YAML", () => {
    expect(fromFile("---\n: : :\n  - [\n---\n", {}).ok).toBe(false);
  });
});
