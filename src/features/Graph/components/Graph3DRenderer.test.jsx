// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Group, PerspectiveCamera } from "three";

const h = vi.hoisted(() => ({ instances: [], fail: false }));

// Chainable stand-in for 3d-force-graph: every method returns the graph, calls are recorded.
vi.mock("3d-force-graph", () => ({
  default: function ForceGraph3D() {
    if (h.fail) throw new Error("Error creating WebGL context.");
    const controls = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const renderer = {
      domElement: document.createElement("canvas"),
      setPixelRatio: vi.fn(),
      forceContextLoss: vi.fn(),
      info: { render: { calls: 7, triangles: 100 }, memory: { geometries: 3, textures: 2 } },
    };
    const camera = new PerspectiveCamera(50, 1, 0.1, 5000);
    camera.position.set(0, 0, 200);
    const threeScene = new Group();
    const fns = new Map();
    const special = {
      controls: () => controls,
      renderer: () => renderer,
      camera: () => camera,
      scene: () => threeScene,
    };
    fns.set("d3Force", vi.fn(() => ({ strength: vi.fn(), distance: vi.fn() })));
    const graph = new Proxy({}, {
      get: (_, prop) => {
        if (prop === "calls") return fns;
        if (prop === "controlsMock") return controls;
        if (prop === "rendererMock") return renderer;
        if (prop === "threeScene") return threeScene;
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
  groupPull: 20,
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

  it("names the stage and describes how to operate it and reach notes without a pointer", () => {
    render(<Graph3DRenderer {...baseProps} />);
    const stage = screen.getByRole("group", { name: "3D knowledge graph" });
    const help = document.getElementById(stage.getAttribute("aria-describedby"));
    expect(help.textContent).toMatch(/search/i);
    expect(help.textContent).toMatch(/Shift\+Enter/);
  });

  it("turns auto-rotation off when the user prefers reduced motion", () => {
    const original = window.matchMedia;
    window.matchMedia = (query) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} });
    try {
      render(<Graph3DRenderer {...baseProps} />);
      expect(h.instances[0].controlsMock.autoRotate).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it("tracks a drag so a flick keeps spinning, and cleans up its listeners", () => {
    const { unmount } = render(<Graph3DRenderer {...baseProps} />);
    const { controlsMock } = h.instances[0];
    const registered = controlsMock.addEventListener.mock.calls.map(([name]) => name);
    expect(registered).toEqual(expect.arrayContaining(["start", "change", "end"]));
    unmount();
    const removed = controlsMock.removeEventListener.mock.calls.map(([name]) => name);
    expect(removed).toEqual(expect.arrayContaining(["start", "change", "end"]));
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

  describe("group by folder", () => {
    const folderCalls = (graph) => graph.calls.get("d3Force").mock.calls.filter((c) => c[0] === "folder");
    const specs = ["a", "b", "c", "d", "e"].map((id) => ({ id, title: id, type: "note", tags: [], folder: "Specs/Wave 1" }));

    it("registers the folder force when on and removes it when off, re-heating on the toggle", () => {
      const { rerender } = render(<Graph3DRenderer {...baseProps} />);
      const graph = h.instances[0];
      expect(folderCalls(graph).at(-1)[1]).toEqual(expect.any(Function));
      expect(graph.calls.get("d3ReheatSimulation")).toBeUndefined();

      rerender(<Graph3DRenderer {...baseProps} groupByFolder={false} />);
      expect(folderCalls(graph).at(-1)[1]).toBeNull();
      expect(graph.calls.get("d3ReheatSimulation")).toHaveBeenCalledTimes(1);

      rerender(<Graph3DRenderer {...baseProps} groupByFolder />);
      expect(folderCalls(graph).at(-1)[1]).toEqual(expect.any(Function));
      expect(graph.calls.get("d3ReheatSimulation")).toHaveBeenCalledTimes(2);
    });

    it("re-heats at most once per interval while Group pull moves, then settles on the last value", () => {
      vi.useFakeTimers();
      try {
        const { rerender, unmount } = render(<Graph3DRenderer {...baseProps} />);
        const reheats = () => h.instances[0].calls.get("d3ReheatSimulation")?.mock.calls.length ?? 0;
        expect(reheats()).toBe(0);
        rerender(<Graph3DRenderer {...baseProps} groupPull={40} />);
        expect(reheats()).toBe(1);
        rerender(<Graph3DRenderer {...baseProps} groupPull={50} />);
        rerender(<Graph3DRenderer {...baseProps} groupPull={60} />);
        expect(reheats()).toBe(1);
        vi.advanceTimersByTime(300);
        expect(reheats()).toBe(2);
        unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it("does not re-heat on a Group pull change while grouping is off", () => {
      const { rerender } = render(<Graph3DRenderer {...baseProps} groupByFolder={false} />);
      rerender(<Graph3DRenderer {...baseProps} groupByFolder={false} groupPull={70} />);
      expect(h.instances[0].calls.get("d3ReheatSimulation")).toBeUndefined();
    });

    it("starts without the force when the saved choice is off", () => {
      render(<Graph3DRenderer {...baseProps} groupByFolder={false} />);
      const graph = h.instances[0];
      expect(folderCalls(graph).every((c) => c[1] === null)).toBe(true);
      expect(graph.calls.get("d3ReheatSimulation")).toBeUndefined();
    });

    it("floats a label per big folder, hides them when off, and frees them on unmount", () => {
      const frames = [];
      const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
      const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
      const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
      const canvas = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        measureText: () => ({ width: 40 }), fillText() {}, translate() {}, fillRect() {}, clearRect() {},
      });
      try {
        const { rerender, unmount } = render(<Graph3DRenderer {...baseProps} nodes={specs} links={[]} />);
        const graph = h.instances[0];
        graph.calls.get("graphData").mock.calls.at(-1)[0].nodes.forEach((n, i) => Object.assign(n, { x: i * 5, y: 0, z: 0 }));
        const tick = () => frames.splice(0).forEach((cb) => cb(performance.now() + 16));
        tick();
        tick();
        expect(window.__maiaGraphStats().folderLabels).toBe(1); // Specs holds exactly Specs/Wave 1's notes, so only the deeper one is labelled
        expect(graph.threeScene.children).toHaveLength(1);

        rerender(<Graph3DRenderer {...baseProps} nodes={specs} links={[]} groupByFolder={false} />);
        expect(graph.threeScene.children).toHaveLength(0);

        rerender(<Graph3DRenderer {...baseProps} nodes={specs} links={[]} groupByFolder />);
        tick();
        expect(graph.threeScene.children).toHaveLength(1);
        unmount();
        expect(graph.threeScene.children).toHaveLength(0);
      } finally {
        raf.mockRestore();
        width.mockRestore();
        height.mockRestore();
        canvas.mockRestore();
      }
    });
  });

  it("disposes the renderer and listeners on unmount", () => {
    const { unmount } = render(<Graph3DRenderer {...baseProps} />);
    const graph = h.instances[0];
    unmount();
    expect(graph.calls.get("_destructor")).toHaveBeenCalledTimes(1);
    expect(graph.rendererMock.forceContextLoss).toHaveBeenCalled();
    expect(graph.controlsMock.removeEventListener).toHaveBeenCalledWith("start", expect.any(Function));
  });

  it("exposes dev-only stats while mounted and removes them on unmount", () => {
    const { unmount } = render(<Graph3DRenderer {...baseProps} />);
    expect(window.__maiaGraphStats()).toMatchObject({ calls: 7, triangles: 100, geometries: 3, textures: 2, labelsVisible: 0, nodes: 2, links: 1 });
    unmount();
    expect(window.__maiaGraphStats).toBeUndefined();
  });

  it("reports WebGL failure instead of throwing", () => {
    h.fail = true;
    render(<Graph3DRenderer {...baseProps} />);
    expect(baseProps.onUnavailable).toHaveBeenCalledTimes(1);
  });
});
