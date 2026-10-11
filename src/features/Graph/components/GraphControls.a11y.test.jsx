// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import GraphControls from "./GraphControls.jsx";

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const nodes = [
  { id: "a", title: "Alpha", type: "note" },
  { id: "p", title: "Alpine project", type: "project", realId: "proj-1" },
];

function Harness({ onOpenNode = vi.fn(), handleZoomToNode = vi.fn(), onSearchSubmit = vi.fn() }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const results = searchQuery ? nodes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  return (
    <GraphControls
      isPanelOpen={isPanelOpen}
      setIsPanelOpen={setIsPanelOpen}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={results}
      handleZoomToNode={handleZoomToNode}
      onOpenNode={onOpenNode}
      onSearchSubmit={onSearchSubmit}
      values={{ showOnlyProjects: false, showOrphans: true, showGhostNodes: false, nodeSize: 1, linkThickness: 1.5, fontSize: 1, repelForce: 150, linkDistance: 100 }}
      setters={{}}
      hotTags={new Set()}
      activeCluster={null}
      setActiveCluster={() => {}}
      clusters={[]}
      colors={["black"]}
      nodeDotColor={() => "black"}
      view={{ mode: "3d", setMode: () => {}, colorBy: "folder", setColorBy: () => {}, legend: [] }}
    />
  );
}

afterEach(cleanup);

describe("GraphControls accessibility", () => {
  it("has one stable toggle name with aria-expanded, and the closed panel is inert", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "Graph controls" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("section[aria-label='Graph controls']")).toHaveAttribute("inert");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: "Find node" })).toBeInTheDocument();
  });

  it("moves focus into the panel on open and back to the toggle on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "Graph controls" });
    await user.click(toggle);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Find node" })));
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(toggle);
  });

  it("exposes the dimension choice as a named group of pressed buttons and has no colour picker", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Graph controls" }));
    const group = screen.getByRole("group", { name: "Graph dimensions" });
    expect(screen.getByRole("button", { name: "3D" })).toHaveAttribute("aria-pressed", "true");
    expect(group).toBeInTheDocument();
    // The graph is monochrome now, so there is nothing to colour by.
    expect(screen.queryByRole("group", { name: "Color by" })).toBeNull();
  });

  it("exposes every slider with a name and a value text", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Graph controls" }));
    for (const name of ["Node size", "Link thickness", "Text size", "Entropy", "Entanglement"]) {
      const slider = screen.getByRole("slider", { name });
      expect(slider).toHaveAttribute("aria-valuetext");
    }
  });

  it("reports the match count in a live region and opens a match with Shift+Enter without a pointer", async () => {
    const user = userEvent.setup();
    const onOpenNode = vi.fn();
    const handleZoomToNode = vi.fn();
    render(<Harness onOpenNode={onOpenNode} handleZoomToNode={handleZoomToNode} />);
    await user.click(screen.getByRole("button", { name: "Graph controls" }));
    await user.type(screen.getByRole("searchbox", { name: "Find node" }), "alp");
    const live = screen.getAllByRole("status").find((el) => /matching/.test(el.textContent));
    expect(live).toHaveTextContent("2 matching nodes.");
    const matches = screen.getByRole("list", { name: "Matching nodes" });
    const project = within(matches).getByRole("button", { name: /Alpine project/ });
    project.focus();
    await user.keyboard("{Enter}");
    expect(handleZoomToNode).toHaveBeenCalledWith("p");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onOpenNode).toHaveBeenCalledWith(nodes[1]);
    expect(project.getAttribute("aria-keyshortcuts")).toBe("Shift+Enter");
  });

  it("opens the first match with Enter in the search box", async () => {
    const user = userEvent.setup();
    const onSearchSubmit = vi.fn();
    render(<Harness onSearchSubmit={onSearchSubmit} />);
    await user.click(screen.getByRole("button", { name: "Graph controls" }));
    await user.type(screen.getByRole("searchbox", { name: "Find node" }), "alp{Enter}");
    expect(onSearchSubmit).toHaveBeenCalled();
  });
});
