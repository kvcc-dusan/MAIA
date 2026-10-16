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
const rendered = vi.hoisted(() => ({ props: null }));
vi.mock("../components/GraphRenderer.jsx", () => ({
  default: (props) => {
    rendered.props = props;
    return <div data-testid="graph-2d" />;
  },
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

describe("GraphPage links", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("maia_graph_view", "2d");
    rendered.props = null;
  });
  afterEach(cleanup);

  const pairs = () => rendered.props.links.map((l) => `${l.source}>${l.target}`).sort();

  it("links notes by folder path and heading even when titles differ from file names", async () => {
    const sm = (id, title, folder, fileName, content = "") => ({ id, title, folder, fileName, content, tags: [] });
    const vault = [
      sm("root", "Speculum Mundi", "sm", "speculum-mundi", "[[cosmos/00-overview]] [[mind/00-overview]]"),
      sm("co", "COSMOS — Overview", "sm/cosmos", "00-overview", "[[cosmos/01-reading-path#COS-F-04]] [[#Local heading]]"),
      sm("cr", "COSMOS — Reading path", "sm/cosmos", "01-reading-path", "[[00-overview|back]]"),
      sm("mo", "MIND — Overview", "sm/mind", "00-overview"),
    ];
    render(<GraphPage notes={vault} projects={[]} onOpenNote={vi.fn()} />);
    await screen.findByTestId("graph-2d");
    expect(pairs()).toEqual(["co>cr", "cr>co", "root>co", "root>mo"]);
  });

  it("still links by plain title", async () => {
    const vault = [
      { id: "a", title: "Alpha", content: "see [[beta]]", tags: [] },
      { id: "b", title: "Beta", content: "", tags: [] },
    ];
    render(<GraphPage notes={vault} projects={[]} onOpenNote={vi.fn()} />);
    await screen.findByTestId("graph-2d");
    expect(pairs()).toEqual(["a>b"]);
  });
});
