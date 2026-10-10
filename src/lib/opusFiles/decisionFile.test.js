import { describe, it, expect } from "vitest";
import { fromFile, toFile } from "./decisionFile.js";

const ctx = { workstreams: [{ id: "w1", name: "Design" }], milestones: [] };
const DECISION = `---
id: d1
title: Use Tailwind
date: 2026-10-05
by: Dusan
workstream: Design
---

Fast to build, matches the stack.
`;

describe("decisionFile", () => {
  it("reads keys and body", () => {
    const { item, warnings } = fromFile(DECISION, { fallbackId: "fb", projectContext: ctx });
    expect(warnings).toEqual([]);
    expect(item).toMatchObject({ id: "d1", title: "Use Tailwind", date: "2026-10-05", by: "Dusan", workstreamId: "w1" });
    expect(item.detail).toBe("Fast to build, matches the stack.");
  });

  it("round-trips untouched, CRLF and extra-key files", () => {
    const { item } = fromFile(DECISION, { fallbackId: "fb", projectContext: ctx });
    expect(toFile(item, ctx, { source: DECISION })).toBe(DECISION);
    const odd = "---\r\n# c\r\nid: d2\r\ntitle: T\r\nlinked: [[Other note]]\r\n---\r\nbody\r\n";
    const parsed = fromFile(odd, { fallbackId: "fb", projectContext: ctx });
    expect(parsed.ok).toBe(true);
    expect(toFile(parsed.item, ctx, { source: odd })).toBe(odd.replace(/\r\n/g, "\n"));
  });

  it("handles a typo'd workstream and missing keys", () => {
    const { item, warnings } = fromFile("---\nid: d3\nworkstream: Desing\n---\n", { fallbackId: "fb", fallbackTitle: "Name", projectContext: ctx });
    expect(item.title).toBe("Name");
    expect(item.workstreamId).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it("writes a new decision with the name reference", () => {
    const out = toFile({ id: "d4", title: "T", date: "2026-01-01", by: "", workstreamId: "w1", detail: "why" }, ctx);
    expect(out).toBe("---\nid: d4\ntitle: T\ndate: 2026-01-01\nworkstream: Design\n---\n\nwhy\n");
  });

  it("returns ok:false for bad YAML", () => {
    expect(fromFile("---\ntitle: {a\n---\n", {}).ok).toBe(false);
  });
});
