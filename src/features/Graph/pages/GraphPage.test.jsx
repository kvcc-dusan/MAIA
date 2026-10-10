// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("3d-force-graph", () => ({
  default: function ForceGraph3D() {
    throw new Error("Error creating WebGL context.");
  },
}));
vi.mock("../components/GraphRenderer.jsx", () => ({
  default: () => <div data-testid="graph-2d" />,
}));

import GraphPage from "./GraphPage.jsx";

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const notes = [{ id: "n1", title: "One", content: "", tags: [], folder: "Work" }];

describe("GraphPage view mode", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("falls back to 2D with a notice when 3D cannot start, keeping the saved choice", async () => {
    localStorage.setItem("maia_graph_view", "3d");
    render(<GraphPage notes={notes} projects={[]} onOpenNote={vi.fn()} />);
    expect(await screen.findByText("3D view is not available")).toBeInTheDocument();
    expect(await screen.findByTestId("graph-2d")).toBeInTheDocument();
    expect(localStorage.getItem("maia_graph_view")).toBe("3d");
  });

  it("starts in 2D without a notice when the user chose 2D", async () => {
    localStorage.setItem("maia_graph_view", "2d");
    render(<GraphPage notes={notes} projects={[]} onOpenNote={vi.fn()} />);
    expect(await screen.findByTestId("graph-2d")).toBeInTheDocument();
    expect(screen.queryByText("3D view is not available")).toBeNull();
  });
});
