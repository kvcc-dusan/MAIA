import { describe, expect, it } from "vitest";
import {
  DIM_OPACITY, buildAdjacency, buildGraphData, clusterMembers, computeFocus, flyTarget, isLit, linkRotation,
  boundingSphere, diffFocus, fitDistance, linkState, matchNodes, nodeRadius, qualityTier,
} from "./graphData3d.js";
import { createGravityForce, linkWidthFor } from "./graphForces.js";

const n = (id, extra = {}) => ({ id, title: id.toUpperCase(), type: "note", tags: [], ...extra });

describe("buildGraphData", () => {
  it("counts degree and drops self, duplicate and dangling links", () => {
    const { nodes, links, degrees } = buildGraphData(
      [n("a"), n("b"), n("c")],
      [{ source: "a", target: "b" }, { source: "b", target: "a" }, { source: "a", target: "a" }, { source: "a", target: "zzz" }, { source: "b", target: "c" }],
    );
    expect(links).toHaveLength(2);
    expect(degrees.get("b")).toBe(2);
    expect(nodes.find((x) => x.id === "b").degree).toBe(2);
  });

  it("reuses unchanged node objects and keeps positions of rebuilt ones", () => {
    const first = buildGraphData([n("a"), n("b")], [{ source: "a", target: "b" }]);
    first.nodes[0].x = 5;
    first.nodes[0].y = 6;
    first.nodes[0].z = 7;
    const same = buildGraphData([n("a"), n("b")], [{ source: "a", target: "b" }], first);
    expect(same.nodes[0]).toBe(first.nodes[0]);
    const renamed = buildGraphData([n("a", { title: "New" }), n("b")], [{ source: "a", target: "b" }], first);
    expect(renamed.nodes[0]).not.toBe(first.nodes[0]);
    expect(renamed.nodes[0]).toMatchObject({ x: 5, y: 6, z: 7, title: "New" });
  });

  it("keeps a node the user placed pinned when it is rebuilt", () => {
    const first = buildGraphData([n("a"), n("b")], [{ source: "a", target: "b" }]);
    Object.assign(first.nodes[0], { x: 5, y: 6, z: 7, fx: 5, fy: 6, fz: 7 });
    const renamed = buildGraphData([n("a", { title: "New" }), n("b")], [{ source: "a", target: "b" }], first);
    expect(renamed.nodes[0]).toMatchObject({ fx: 5, fy: 6, fz: 7 });
    expect(renamed.nodes[1].fx).toBeUndefined();
  });

  it("makes fresh link objects each time and accepts object ends", () => {
    const first = buildGraphData([n("a"), n("b")], [{ source: "a", target: "b" }]);
    const again = buildGraphData([n("a"), n("b")], [{ source: first.nodes[0], target: first.nodes[1] }], first);
    expect(again.links[0]).not.toBe(first.links[0]);
    expect(again.links[0]).toEqual({ source: "a", target: "b" });
  });
});

describe("nodeRadius", () => {
  it("grows with degree and scales with the node size control", () => {
    expect(nodeRadius(n("a"), 9, 1)).toBeGreaterThan(nodeRadius(n("a"), 0, 1));
    expect(nodeRadius(n("a"), 4, 2)).toBeCloseTo(nodeRadius(n("a"), 4, 1) * 2, 5);
  });
  it("has a floor and a fixed size for projects", () => {
    expect(nodeRadius(n("a"), 0, 0.01)).toBeGreaterThanOrEqual(1.5);
    expect(nodeRadius({ type: "project" }, 0, 1)).toBeGreaterThan(nodeRadius(n("a"), 0, 1));
  });
});

describe("search and focus", () => {
  const nodes = [n("alpha", { title: "Alpha plan", tags: ["Work"] }), n("beta", { title: "Beta" }), n("gamma", { tags: ["workout"] })];
  it("matches title or tag substrings, case-insensitively", () => {
    expect([...matchNodes(nodes, "WORK")]).toEqual(["alpha", "gamma"]);
    expect([...matchNodes(nodes, "beta")]).toEqual(["beta"]);
  });
  it("returns null for an empty query", () => {
    expect(matchNodes(nodes, "   ")).toBeNull();
  });
  it("builds symmetric neighbour sets, also from node-object link ends", () => {
    const a = { id: "a" };
    const adjacency = buildAdjacency([{ source: a, target: "b" }, { source: "c", target: "a" }]);
    expect([...adjacency.get("a")].sort()).toEqual(["b", "c"]);
    expect([...adjacency.get("b")]).toEqual(["a"]);
  });
  it("lights the hovered node and its neighbours, dimming the rest", () => {
    const adjacency = buildAdjacency([{ source: "a", target: "b" }, { source: "c", target: "d" }]);
    const focus = computeFocus({ hoverId: "a", adjacency, matchIds: null, clusterIds: null });
    expect(isLit(focus, "a")).toBe(true);
    expect(isLit(focus, "b")).toBe(true);
    expect(isLit(focus, "c")).toBe(false);
    expect(DIM_OPACITY).toBeLessThan(1);
  });
  it("prefers hover over search over cluster, and lights all with no focus", () => {
    const adjacency = new Map();
    const matchIds = new Set(["x"]);
    const clusterIds = new Set(["y"]);
    expect(computeFocus({ hoverId: null, adjacency, matchIds, clusterIds }).kind).toBe("search");
    expect(computeFocus({ hoverId: null, adjacency, matchIds: null, clusterIds }).kind).toBe("cluster");
    expect(isLit(computeFocus({ hoverId: null, adjacency, matchIds: null, clusterIds: null }), "anything")).toBe(true);
  });
  it("selects cluster members by findClusters index", () => {
    const list = [n("a", { group: 0 }), n("b", { group: 1 })];
    expect([...clusterMembers(list, 1)]).toEqual(["b"]);
    expect(clusterMembers(list, null)).toBeNull();
  });
});

describe("camera, quality and links", () => {
  it("flies to the outward side of a node", () => {
    expect(flyTarget({ x: 10, y: 0, z: 0 }, 10)).toEqual({ x: 20, y: 0, z: 0 });
    expect(flyTarget({ x: 0, y: 0, z: 0 }, 30)).toEqual({ x: 0, y: 0, z: 30 });
  });
  it("lowers resolution and label count as the graph grows", () => {
    expect(qualityTier(100, 3)).toMatchObject({ pixelRatio: 2, thinLinks: false, labelCap: 60 });
    expect(qualityTier(258, 3)).toMatchObject({ pixelRatio: 1.5, thinLinks: false });
    expect(qualityTier(258, 1)).toMatchObject({ pixelRatio: 1 });
    expect(qualityTier(2001, 3)).toMatchObject({ pixelRatio: 1, thinLinks: true, labelCap: 30 });
    expect(qualityTier(2001).sphereLevels.at(-1)).toBeLessThan(qualityTier(10).sphereLevels.at(-1));
    expect(qualityTier(10)).not.toHaveProperty("glow");
  });
  it("gives each link a stable angle", () => {
    const l = { source: "a", target: "b" };
    expect(linkRotation(l)).toBe(linkRotation({ source: { id: "a" }, target: { id: "b" } }));
  });
});

describe("force mapping", () => {
  it("draws low thickness values as plain lines", () => {
    expect(linkWidthFor(1.5, false)).toBe(0);
    expect(linkWidthFor(0.5, false)).toBe(0);
    expect(linkWidthFor(3, false)).toBeGreaterThan(linkWidthFor(2, false));
  });
  it("gravity force pulls toward the origin in 3D", () => {
    const node = { x: 10, y: -10, z: 4, vx: 0, vy: 0, vz: 0 };
    const force = createGravityForce(0.5);
    force.initialize([node]);
    force(1);
    expect(node.vx).toBeLessThan(0);
    expect(node.vy).toBeGreaterThan(0);
    expect(node.vz).toBeLessThan(0);
  });
});

describe("camera fit", () => {
  it("centres on the nodes and ignores far outliers", () => {
    const ring = Array.from({ length: 40 }, (_, i) => ({ x: Math.cos(i) * 10, y: Math.sin(i) * 10, z: 0 }));
    const { center, radius } = boundingSphere([...ring, { x: 1000, y: 0, z: 0 }]);
    expect(Math.abs(center.x)).toBeLessThan(40);
    expect(radius).toBeLessThan(200);
  });
  it("falls back for nodes without positions yet", () => {
    expect(boundingSphere([{ id: "a" }]).radius).toBeGreaterThan(0);
  });
  it("moves further away for bigger graphs and narrower viewports", () => {
    expect(fitDistance(200, 50, 1.5)).toBeGreaterThan(fitDistance(100, 50, 1.5));
    expect(fitDistance(100, 50, 0.5)).toBeGreaterThan(fitDistance(100, 50, 1.5));
  });
});

describe("diffFocus", () => {
  const adjacency = buildAdjacency([{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "d", target: "e" }]);
  const none = computeFocus({ hoverId: null, adjacency, matchIds: null, clusterIds: null });
  const hover = (hoverId) => computeFocus({ hoverId, adjacency, matchIds: null, clusterIds: null });
  const ids = ["a", "b", "c", "d", "e"];

  it("reports nothing when the focus did not change", () => {
    expect(diffFocus(none, none, ids)).toEqual([]);
  });
  it("reports every node that gets dimmed plus the hovered one when a hover starts", () => {
    expect(diffFocus(none, hover("a"), ids).sort()).toEqual(["a", "c", "d", "e"]);
  });
  it("reports only the symmetric difference when the hover moves", () => {
    // b stays lit and not hovered, so it is untouched
    expect(diffFocus(hover("a"), hover("c"), ids).sort()).toEqual(["a", "c"]);
  });
  it("reports the hover flag even when the lit set stays the same", () => {
    expect(diffFocus(hover("a"), hover("b"), ids).sort()).toEqual(["a", "b", "c"]);
  });
  it("restores everything when the hover ends", () => {
    expect(diffFocus(hover("d"), none, ids).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("linkState", () => {
  const adjacency = buildAdjacency([{ source: "a", target: "b" }, { source: "c", target: "d" }]);
  it("is base without focus", () => {
    expect(linkState(computeFocus({ hoverId: null, adjacency, matchIds: null, clusterIds: null }), "a", "b")).toBe("base");
  });
  it("brightens links touching the hovered node and dims the rest", () => {
    const focus = computeFocus({ hoverId: "a", adjacency, matchIds: null, clusterIds: null });
    expect(linkState(focus, "a", "b")).toBe("bright");
    expect(linkState(focus, "c", "d")).toBe("dim");
  });
  it("keeps links between two lit nodes for search and cluster focus", () => {
    const focus = computeFocus({ hoverId: null, adjacency, matchIds: new Set(["a", "b"]), clusterIds: null });
    expect(linkState(focus, "a", "b")).toBe("lit");
    expect(linkState(focus, "a", "c")).toBe("dim");
  });
});
