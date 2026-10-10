import { describe, expect, it } from "vitest";
import { historyReducer, initialHistory } from "./useNavHistory.js";

const visit = (state, location) => historyReducer(state, { type: "visit", location });
const loc = (page, extra = {}) => ({ page, ...extra });

describe("historyReducer", () => {
  it("starts empty and records the first location", () => {
    const s = visit(initialHistory, loc("projects"));
    expect(s.entries).toEqual([loc("projects")]);
    expect(s.index).toBe(0);
  });

  it("ignores a visit equal to the current entry (restoring must not push)", () => {
    const s1 = visit(initialHistory, loc("projects", { projectId: "a" }));
    const s2 = visit(s1, loc("projects", { projectId: "a", noteId: null }));
    expect(s2).toBe(s1);
  });

  it("treats a different project or note on the same page as a new entry", () => {
    let s = visit(initialHistory, loc("projects", { projectId: "a" }));
    s = visit(s, loc("projects", { projectId: "b" }));
    s = visit(s, loc("codex", { noteId: "n1" }));
    expect(s.entries).toHaveLength(3);
    expect(s.index).toBe(2);
  });

  it("goes back and forward within bounds", () => {
    let s = visit(initialHistory, loc("projects"));
    s = visit(s, loc("codex"));
    s = historyReducer(s, { type: "back" });
    expect(s.index).toBe(0);
    expect(historyReducer(s, { type: "back" })).toBe(s);
    s = historyReducer(s, { type: "forward" });
    expect(s.index).toBe(1);
    expect(historyReducer(s, { type: "forward" })).toBe(s);
  });

  it("drops the forward entries when navigating after going back", () => {
    let s = visit(initialHistory, loc("projects"));
    s = visit(s, loc("codex"));
    s = visit(s, loc("graph"));
    s = historyReducer(s, { type: "back" });
    s = historyReducer(s, { type: "back" });
    s = visit(s, loc("ledgerPage"));
    expect(s.entries.map((e) => e.page)).toEqual(["projects", "ledgerPage"]);
    expect(s.index).toBe(1);
  });

  it("caps the history at 50 entries, keeping the newest", () => {
    let s = initialHistory;
    for (let i = 0; i < 60; i++) s = visit(s, loc("codex", { noteId: `n${i}` }));
    expect(s.entries).toHaveLength(50);
    expect(s.entries[0].noteId).toBe("n10");
    expect(s.index).toBe(49);
  });
});
