import { describe, expect, it } from "vitest";
import { keepGraphIdentity } from "./stableGraph.js";

const node = (id, extra = {}) => ({ id, title: id.toUpperCase(), type: "note", folder: "", val: 1, tags: [], projectIds: [], ...extra });
const build = () => ({
  nodes: [node("a"), node("b"), node("c")],
  links: [{ source: "a", target: "b" }],
});

describe("keepGraphIdentity", () => {
  it("returns the new graph when there is no previous one", () => {
    const next = build();
    expect(keepGraphIdentity(null, next)).toBe(next);
  });

  it("returns the previous graph when the structure is unchanged, so the simulation does not restart", () => {
    const prev = build();
    // What D3 does to the previous graph: positions on nodes, node objects on link ends.
    prev.nodes[0].x = 10;
    prev.links[0] = { source: prev.nodes[0], target: prev.nodes[1] };
    expect(keepGraphIdentity(prev, build())).toBe(prev);
  });

  it("keeps unchanged node objects and carries positions to a changed node", () => {
    const prev = build();
    Object.assign(prev.nodes[1], { x: 5, y: 6, fx: 5, fy: 6 });
    const next = build();
    next.nodes[1] = node("b", { title: "Renamed" });

    const kept = keepGraphIdentity(prev, next);
    expect(kept).not.toBe(prev);
    expect(kept.nodes[0]).toBe(prev.nodes[0]);
    expect(kept.nodes[1]).not.toBe(prev.nodes[1]);
    expect(kept.nodes[1]).toMatchObject({ title: "Renamed", x: 5, y: 6, fx: 5, fy: 6 });
  });

  it("brings a new node in as built and reports a change when links change", () => {
    const prev = build();
    const next = build();
    next.nodes.push(node("d"));
    expect(keepGraphIdentity(prev, next).nodes[3]).toBe(next.nodes[3]);

    const relinked = build();
    relinked.links = [{ source: "a", target: "c" }];
    const kept = keepGraphIdentity(prev, relinked);
    expect(kept).not.toBe(prev);
    expect(kept.links).toBe(relinked.links);
    expect(kept.nodes[0]).toBe(prev.nodes[0]);
  });
});
