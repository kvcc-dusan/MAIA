import { describe, it, expect } from "vitest";
import {
  DOC_KINDS, DOC_STATUSES, docKindLabel, docStatusLabel, isDocument, projectDocuments, projectNotes, docMeta,
} from "./docModel.js";

const notes = [
  { id: "d1", projectIds: ["p1"], kind: "plan", status: "current", createdAt: "2026-09-01", updatedAt: "2026-10-01" },
  { id: "d2", projectIds: ["p1"], kind: "spec", status: "draft", createdAt: "2026-09-20" },
  { id: "d3", projectIds: ["p2"], kind: "brief", status: "draft", createdAt: "2026-09-25" },
  { id: "n1", projectIds: ["p1"], createdAt: "2026-09-10" },
  { id: "n2", projectIds: ["p1", "p2"], createdAt: "2026-09-30" },
  { id: "n3", projectIds: [], createdAt: "2026-09-30" },
];

describe("labels", () => {
  it("lists kinds and statuses with labels", () => {
    expect(DOC_KINDS.map((k) => k.label)).toEqual(["Plan", "Spec", "Research", "Brief", "Other"]);
    expect(DOC_STATUSES.map((s) => s.label)).toEqual(["Draft", "Current", "Not started", "Superseded"]);
    expect(docKindLabel("spec")).toBe("Spec");
    expect(docStatusLabel("notStarted")).toBe("Not started");
    expect(docKindLabel("nope")).toBe("");
  });
});

describe("isDocument", () => {
  it("is true when kind or status is set", () => {
    expect(isDocument(notes[0])).toBe(true);
    expect(isDocument({ kind: "plan" })).toBe(true);
    expect(isDocument(notes[3])).toBe(false);
    expect(isDocument(null)).toBe(false);
  });
});

describe("projectDocuments and projectNotes", () => {
  it("splits linked notes and sorts each way", () => {
    expect(projectDocuments(notes, "p1").map((n) => n.id)).toEqual(["d1", "d2"]);
    expect(projectNotes(notes, "p1").map((n) => n.id)).toEqual(["n2", "n1"]);
  });
  it("sorts documents by updatedAt before createdAt", () => {
    const docs = [
      { id: "a", projectIds: ["p"], kind: "plan", createdAt: "2026-01-01", updatedAt: "2026-09-01" },
      { id: "b", projectIds: ["p"], kind: "plan", createdAt: "2026-05-01" },
    ];
    expect(projectDocuments(docs, "p").map((n) => n.id)).toEqual(["a", "b"]);
  });
  it("does not mutate the input and tolerates no notes", () => {
    const copy = [...notes];
    projectDocuments(notes, "p1");
    expect(notes).toEqual(copy);
    expect(projectDocuments(undefined, "p1")).toEqual([]);
  });
});

describe("docMeta", () => {
  const project = { workstreams: [{ id: "ws1", name: "Data layer" }] };
  it("resolves workstream and owner", () => {
    expect(docMeta({ workstreamId: "ws1", owner: "Lea Horvat", createdAt: "c", updatedAt: "u" }, project)).toEqual({
      workstreamName: "Data layer", ownerName: "Lea Horvat", updatedAt: "u",
    });
  });
  it("omits what it cannot resolve and falls back to createdAt", () => {
    expect(docMeta({ workstreamId: "gone", createdAt: "c" }, project)).toEqual({ updatedAt: "c" });
  });
});
