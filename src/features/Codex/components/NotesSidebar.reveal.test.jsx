// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesSidebar from "./NotesSidebar.jsx";
import { AUTO_REVEAL_KEY } from "../useAutoReveal.js";
import { EXPANDED_KEY } from "../useExpandedFolders.js";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const folders = ["Omnis", "Omnis/PROJECTS"];
const makeNotes = () => [
  { id: "r", title: "Readme", folder: "" },
  { id: "o", title: "OWL", folder: "Omnis/PROJECTS" },
  { id: "a", title: "AGENTS", folder: "Omnis" },
];

const renderSidebar = (currentNoteId) => {
  const view = (id, notes = makeNotes()) => (
    <NotesSidebar notes={notes} folders={folders} currentNoteId={id} onOpenNote={() => {}} vaultPath={null} />
  );
  const result = render(view(currentNoteId));
  return { ...result, rerenderWith: (id, notes) => result.rerender(view(id, notes)) };
};

const isVisible = (title) => screen.queryByText(title) !== null;
const autoRevealButton = () => screen.getByRole("button", { name: "Auto-reveal current note" });
const scrolledKeys = (spy) => spy.mock.contexts.map((el) => el.dataset.key);

describe("NotesSidebar auto-reveal", () => {
  let scrollSpy;
  beforeEach(() => {
    localStorage.clear();
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
  });
  afterEach(() => {
    cleanup();
    delete Element.prototype.scrollIntoView;
  });

  describe("when off (default)", () => {
    it("opening a note neither expands folders nor scrolls", () => {
      const { rerenderWith } = renderSidebar("r");
      rerenderWith("o");
      expect(isVisible("OWL")).toBe(false);
      expect(isVisible("PROJECTS")).toBe(false);
      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it("starts unpressed and keeps remembered expansion", () => {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(["Omnis"]));
      renderSidebar("r");
      expect(autoRevealButton().getAttribute("aria-pressed")).toBe("false");
      expect(isVisible("AGENTS")).toBe(true);
    });
  });

  describe("button", () => {
    it("turns on, reveals the open note immediately and scrolls its row nearest", async () => {
      renderSidebar("o");
      expect(isVisible("OWL")).toBe(false);
      await userEvent.click(autoRevealButton());
      expect(autoRevealButton().getAttribute("aria-pressed")).toBe("true");
      expect(isVisible("OWL")).toBe(true);
      expect(scrolledKeys(scrollSpy)).toEqual(["n:o"]);
      expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });
      expect(localStorage.getItem(AUTO_REVEAL_KEY)).toBe("true");
    });

    it("turns off on the second click and stops following", async () => {
      const { rerenderWith } = renderSidebar("r");
      await userEvent.click(autoRevealButton());
      await userEvent.click(autoRevealButton());
      expect(autoRevealButton().getAttribute("aria-pressed")).toBe("false");
      expect(localStorage.getItem(AUTO_REVEAL_KEY)).toBe("false");
      scrollSpy.mockClear();
      rerenderWith("o");
      expect(isVisible("OWL")).toBe(false);
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  describe("when on", () => {
    beforeEach(() => localStorage.setItem(AUTO_REVEAL_KEY, "true"));

    it("expands every ancestor of the active note on first render and scrolls to it", () => {
      renderSidebar("o");
      expect(isVisible("OWL")).toBe(true);
      expect(scrolledKeys(scrollSpy)).toEqual(["n:o"]);
    });

    it("scrolls to a root note that needs no expansion", () => {
      renderSidebar("r");
      expect(scrolledKeys(scrollSpy)).toEqual(["n:r"]);
      expect(isVisible("PROJECTS")).toBe(false);
    });

    it("reveals again when the active note changes", () => {
      const { rerenderWith } = renderSidebar("r");
      scrollSpy.mockClear();
      rerenderWith("o");
      expect(isVisible("OWL")).toBe(true);
      expect(scrolledKeys(scrollSpy)).toEqual(["n:o"]);
    });

    it("reveals the new folder when the active note is moved", () => {
      const { rerenderWith } = renderSidebar("a");
      const moved = makeNotes().map((n) => (n.id === "a" ? { ...n, folder: "Omnis/PROJECTS" } : n));
      rerenderWith("a", moved);
      expect(isVisible("PROJECTS")).toBe(true);
    });

    it("does not re-expand or scroll when the user collapses a folder or clicks in the tree", () => {
      const { rerenderWith } = renderSidebar("o");
      scrollSpy.mockClear();
      fireEvent.click(screen.getByText("Omnis"));
      expect(isVisible("PROJECTS")).toBe(false);
      rerenderWith("o", makeNotes());
      expect(isVisible("PROJECTS")).toBe(false);
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
