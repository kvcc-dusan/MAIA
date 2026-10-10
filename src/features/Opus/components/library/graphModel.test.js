import { describe, it, expect } from "vitest";
import { buildGraph, graphSignature, projectNodeId, truncate } from "./graphModel.js";

const project = { id: "p1", name: "Maia" };
const notes = [
  { id: "a", title: "Alpha" },
  { id: "b", title: "" },
  { id: "c", title: "Gamma" },
  { id: "d", title: "Delta" },
];
const size = { w: 400, h: 200 };

describe("truncate", () => {
  it("only cuts text over the limit", () => {
    expect(truncate("short", 22)).toBe("short");
    expect(truncate("x".repeat(23), 22)).toBe(`${"x".repeat(22)}…`);
  });
});

describe("graphSignature", () => {
  it("is stable for the same ids and titles", () => {
    expect(graphSignature(project, notes)).toBe(graphSignature({ ...project }, notes.map((n) => ({ ...n }))));
  });

  it("changes when a note is added, removed or renamed, or the project is renamed", () => {
    const base = graphSignature(project, notes);
    expect(graphSignature(project, notes.slice(1))).not.toBe(base);
    expect(graphSignature(project, [...notes, { id: "e", title: "E" }])).not.toBe(base);
    expect(graphSignature(project, [{ ...notes[0], title: "Renamed" }, ...notes.slice(1)])).not.toBe(base);
    expect(graphSignature({ ...project, name: "Other" }, notes)).not.toBe(base);
  });

  it("ignores everything else on a note", () => {
    const touched = notes.map((n) => ({ ...n, content: "edited", updatedAt: "2026-10-09" }));
    expect(graphSignature(project, touched)).toBe(graphSignature(project, notes));
  });
});

describe("buildGraph", () => {
  it("puts the project in the center and links every note to it", () => {
    const { nodes, links } = buildGraph({ project, notes, size });
    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toMatchObject({ id: projectNodeId("p1"), type: "project", x: 200, y: 100 });
    expect(links).toHaveLength(4);
    expect(links.every((l) => l.source === projectNodeId("p1"))).toBe(true);
    expect(links.map((l) => l.target)).toEqual(["a", "b", "c", "d"]);
  });

  it("spreads notes on a ring around the center, first one straight up", () => {
    const { nodes } = buildGraph({ project, notes, size });
    const radius = Math.min(size.w, size.h) * 0.26;
    nodes.slice(1).forEach((n) => {
      expect(Math.hypot(n.x - 200, n.y - 100)).toBeCloseTo(radius, 5);
    });
    expect(nodes[1].x).toBeCloseTo(200, 5);
    expect(nodes[1].y).toBeLessThan(100);
  });

  it("titles untitled notes", () => {
    expect(buildGraph({ project, notes, size }).nodes[2].title).toBe("Untitled");
  });

  it("reuses remembered positions and ring-places only the new notes", () => {
    const positions = new Map([
      ["a", { x: 11, y: 22 }],
      [projectNodeId("p1"), { x: 5, y: 6 }],
    ]);
    const { nodes } = buildGraph({ project, notes, size, positions });
    expect(nodes[0]).toMatchObject({ x: 5, y: 6 });
    expect(nodes[1]).toMatchObject({ id: "a", x: 11, y: 22 });
    expect(nodes[2].x).not.toBe(11);
  });

  it("returns fresh objects each call and never mutates the inputs", () => {
    const first = buildGraph({ project, notes, size });
    const second = buildGraph({ project, notes, size });
    expect(first.nodes[1]).not.toBe(second.nodes[1]);
    expect(notes[0]).toEqual({ id: "a", title: "Alpha" });
  });

  it("handles a project with a single note", () => {
    const { nodes, links } = buildGraph({ project, notes: [notes[0]], size });
    expect(nodes).toHaveLength(2);
    expect(links).toHaveLength(1);
    expect(Number.isFinite(nodes[1].x)).toBe(true);
  });
});
