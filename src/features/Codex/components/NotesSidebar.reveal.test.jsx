// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import NotesSidebar from "./NotesSidebar.jsx";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const folders = ["Omnis", "Omnis/PROJECTS"];
const makeNotes = () => [
  { id: "r", title: "Readme", folder: "" },
  { id: "o", title: "OWL", folder: "Omnis/PROJECTS" },
  { id: "a", title: "AGENTS", folder: "Omnis" },
];

const renderSidebar = (currentNoteId) => {
  const view = (id, notes = makeNotes()) => (
    <NotesSidebar notes={notes} folders={folders} currentNoteId={id} onOpenNote={() => {}} />
  );
  const result = render(view(currentNoteId));
  return { ...result, rerenderWith: (id, notes) => result.rerender(view(id, notes)) };
};

const isVisible = (title) => screen.queryByText(title) !== null;

describe("NotesSidebar reveals the active note", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("expands every ancestor of the active note on first render", () => {
    renderSidebar("o");
    expect(isVisible("OWL")).toBe(true);
    expect(screen.getByText("PROJECTS").closest("[role=treeitem]")).toBeTruthy();
  });

  it("leaves a root-level active note with nothing expanded", () => {
    renderSidebar("r");
    expect(isVisible("PROJECTS")).toBe(false);
    expect(isVisible("AGENTS")).toBe(false);
  });

  it("does not re-expand after the user collapses, when the same note re-renders", () => {
    const { rerenderWith } = renderSidebar("o");
    fireEvent.click(screen.getByText("Omnis"));
    expect(isVisible("PROJECTS")).toBe(false);
    rerenderWith("o", makeNotes());
    expect(isVisible("PROJECTS")).toBe(false);
  });

  it("reveals again when the active note changes", () => {
    const { rerenderWith } = renderSidebar("r");
    fireEvent.click(screen.getByText("Omnis"));
    fireEvent.click(screen.getByText("Omnis"));
    expect(isVisible("OWL")).toBe(false);
    rerenderWith("o");
    expect(isVisible("OWL")).toBe(true);
  });

  it("reveals the new folder when the active note is moved", () => {
    const { rerenderWith } = renderSidebar("a");
    const moved = makeNotes().map((n) => (n.id === "a" ? { ...n, folder: "Omnis/PROJECTS" } : n));
    rerenderWith("a", moved);
    expect(isVisible("PROJECTS")).toBe(true);
  });
});
