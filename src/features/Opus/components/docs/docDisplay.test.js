import { describe, expect, it } from "vitest";
import { docDraftToFields, docSubtitle, filterDocuments, statusCounts, validateDocDraft } from "./docDisplay";

const project = { workstreams: [{ id: "w1", name: "Launch" }] };
const docs = [
  { id: "a", title: "Launch plan", kind: "plan", status: "current", owner: "Sara Vidmar", workstreamId: "w1", updatedAt: "2026-10-08T10:00:00Z" },
  { id: "b", title: "API spec", kind: "spec", status: "draft" },
];

describe("docDisplay", () => {
  it("builds the subtitle from what is known", () => {
    expect(docSubtitle(docs[0], project)).toBe("Sara Vidmar · Launch · Updated 8 Oct");
    expect(docSubtitle(docs[1], project)).toBe("");
  });
  it("filters by status and by text across title, kind, owner and workstream", () => {
    expect(filterDocuments(docs, { status: "draft", project }).map((d) => d.id)).toEqual(["b"]);
    expect(filterDocuments(docs, { query: "sara", project }).map((d) => d.id)).toEqual(["a"]);
    expect(filterDocuments(docs, { query: "launch", project }).map((d) => d.id)).toEqual(["a"]);
    expect(filterDocuments(docs, { query: "spec", project }).map((d) => d.id)).toEqual(["b"]);
  });
  it("counts per status", () => {
    expect(statusCounts(docs)).toMatchObject({ all: 2, current: 1, draft: 1, superseded: 0 });
  });
  it("validates and trims the draft", () => {
    expect(validateDocDraft({ title: "  " }).title).toBeTruthy();
    expect(docDraftToFields({ title: " X ", kind: "plan", status: "draft", workstreamId: "", owner: " " }))
      .toEqual({ title: "X", kind: "plan", status: "draft", workstreamId: null, owner: "" });
  });
});
