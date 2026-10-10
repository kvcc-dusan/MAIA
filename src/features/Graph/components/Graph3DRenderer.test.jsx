// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const h = vi.hoisted(() => ({ instances: [], fail: false }));

// Chainable stand-in for 3d-force-graph: every method returns the graph, calls are recorded.
vi.mock("3d-force-graph", () => ({
  default: function ForceGraph3D() {
    if (h.fail) throw new Error("Error creating WebGL context.");
    const controls = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const renderer = { domElement: document.createElement("canvas"), setPixelRatio: vi.fn(), forceContextLoss: vi.fn() };
    const fns = new Map();
    const special = {
      controls: () => controls,
      renderer: () => renderer,
      camera: () => ({ position: { x: 0, y: 0, z: 200 } }),
    };
    fns.set("d3Force", vi.fn(() => ({ strength: vi.fn(), distance: vi.fn() })));
    const graph = new Proxy({}, {
      get: (_, prop) => {
        if (prop === "calls") return fns;
        if (prop === "controlsMock") return controls;
        if (prop === "rendererMock") return renderer;
        if (special[prop]) return special[prop];
        if (!fns.has(prop)) fns.set(prop, vi.fn(() => graph));
        return fns.get(prop);
      },
    });
    h.instances.push(graph);
    return graph;
  },
}));

import Graph3DRenderer from "./Graph3DRenderer.jsx";

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const colors = (bgInt) => ({
  bgInt, fgInt: 16777215, neutral: 8947848, textInt: 16777215, isDark: true, colors: new Map([["Work", 255]]),
});
const nodesA = [
  { id: "a", title: "A", type: "note", tags: [], folder: "Work" },
  { id: "b", title: "B", type: "note", tags: [], folder: "Work" },
];
const linksA = [{ source: "a", target: "b" }];

const baseProps = {
  nodes: nodesA,
  links: linksA,
  groupOf: new Map([["a", "Work"], ["b", "Work"]]),
  groupColors: colors(0),
  activeCluster: null,
  onOpenNote: vi.fn(),
  nodeSize: 1,
  linkThickness: 1.5,
  fontSize: 1,
  repelForce: 150,
  linkDistance: 100,
  query: "",
  setHoveredNode: vi.fn(),
  controllerRef: { current: null },
  onUnavailable: vi.fn(),
};

describe("Graph3DRenderer", () => {
  beforeEach(() => {
    h.instances.length = 0;
    h.fail = false;
    baseProps.onUnavailable.mockClear();
  });
  afterEach(cleanup);

  it("creates one scene and exposes an accessible, focusable stage", () => {
    render(<Graph3DRenderer {...baseProps} />);
    expect(h.instances).toHaveLength(1);
    const stage = screen.getByRole("group", { name: /3D knowledge graph/i });
    expect(stage).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("updates data without recreating the scene", () => {
    const { rerender } = render(<Graph3DRenderer {...baseProps} />);
    const graph = h.instances[0];
    const before = graph.calls.get("graphData").mock.calls.length;
    rerender(<Graph3DRenderer {...baseProps} nodes={[...nodesA, { id: "c", title: "C", type: "note", tags: [] }]} />);
    expect(h.instances).toHaveLength(1);
    expect(graph.calls.get("graphData").mock.calls.length).toBeGreaterThan(before);
    const lastData = graph.calls.get("graphData").mock.calls.at(-1)[0];
    expect(lastData.nodes.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("recolours on a theme change without rebuilding", () => {
    const { rerender } = render(<Graph3DRenderer {...baseProps} />);
    const graph = h.instances[0];
    expect(graph.calls.get("backgroundColor").mock.calls.at(-1)[0]).toBe("#000000");
    rerender(<Graph3DRenderer {...baseProps} groupColors={{ ...colors(16777215), isDark: false }} />);
    expect(h.instances).toHaveLength(1);
    expect(graph.calls.get("backgroundColor").mock.calls.at(-1)[0]).toBe("#ffffff");
  });

  it("applies the force controls", () => {
    render(<Graph3DRenderer {...baseProps} />);
    const names = h.instances[0].calls.get("d3Force").mock.calls.map((c) => c[0]);
    expect(names).toEqual(expect.arrayContaining(["charge", "link", "center"]));
  });

  it("disposes the renderer and listeners on unmount", () => {
    const { unmount } = render(<Graph3DRenderer {...baseProps} />);
    const graph = h.instances[0];
    unmount();
    expect(graph.calls.get("_destructor")).toHaveBeenCalledTimes(1);
    expect(graph.rendererMock.forceContextLoss).toHaveBeenCalled();
    expect(graph.controlsMock.removeEventListener).toHaveBeenCalledWith("start", expect.any(Function));
  });

  it("reports WebGL failure instead of throwing", () => {
    h.fail = true;
    render(<Graph3DRenderer {...baseProps} />);
    expect(baseProps.onUnavailable).toHaveBeenCalledTimes(1);
  });
});
