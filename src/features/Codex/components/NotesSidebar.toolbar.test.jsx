// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesSidebar from "./NotesSidebar.jsx";
import { EXPANDED_KEY } from "../useExpandedFolders.js";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Arc's tooltip measures its text; jsdom has no ResizeObserver.
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const t = (iso) => new Date(iso).getTime();
const notes = [
  { id: "r1", title: "banana", folder: "", modifiedAt: t("2026-03-01"), birthAt: t("2026-01-03") },
  { id: "r2", title: "Apple", folder: "", modifiedAt: t("2026-01-01"), birthAt: t("2026-02-01") },
  { id: "r3", title: "cherry", folder: "", modifiedAt: t("2026-02-01"), birthAt: t("2026-01-01") },
];
const folders = ["Alpha", "Alpha/Sub", "beta"];

const setup = (props = {}) => {
  const handlers = { onOpenNote: vi.fn(), onCreateNote: vi.fn(), onCreateJournal: vi.fn() };
  render(<NotesSidebar notes={notes} folders={folders} currentNoteId={null} vaultPath="/v/one" {...handlers} {...props} />);
  return handlers;
};
const rowNames = () => screen.getAllByRole("treeitem").map((el) => el.textContent.replace(/\d+$/, ""));
const openSortMenu = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Change sort order" }));
  return screen.findAllByRole("menuitemradio");
};
const toggleAll = () => screen.getByRole("button", { name: /^(Collapse|Expand) all$/ });

describe("NotesSidebar toolbar", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("lists the buttons in order, all in the tab order, inside a toolbar", () => {
    setup();
    const bar = screen.getByRole("toolbar", { name: "Notes actions" });
    expect(within(bar).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "New note", "New journal", "New folder", "Change sort order", "Auto-reveal current note", "Expand all",
    ]);
    within(bar).getAllByRole("button").forEach((b) => expect(b.tabIndex).not.toBe(-1));
  });

  it("new note and new journal call their handlers; new folder opens the dialog", async () => {
    const { onCreateNote, onCreateJournal } = setup();
    await userEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(onCreateNote).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "New journal" }));
    expect(onCreateJournal).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "New folder" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  describe("sort", () => {
    it("shows six radio items with a check on the active one (A to Z by default)", async () => {
      setup();
      const items = await openSortMenu();
      expect(items.map((i) => i.textContent)).toEqual([
        "File name (A to Z)", "File name (Z to A)", "Modified time (new to old)",
        "Modified time (old to new)", "Created time (new to old)", "Created time (old to new)",
      ]);
      expect(items.map((i) => i.getAttribute("aria-checked"))).toEqual(["true", "false", "false", "false", "false", "false"]);
    });

    it.each([
      ["File name (Z to A)", ["beta", "Alpha", "cherry", "banana", "Apple"]],
      ["Modified time (new to old)", ["Alpha", "beta", "banana", "cherry", "Apple"]],
      ["Modified time (old to new)", ["Alpha", "beta", "Apple", "cherry", "banana"]],
      ["Created time (new to old)", ["Alpha", "beta", "Apple", "banana", "cherry"]],
      ["Created time (old to new)", ["Alpha", "beta", "cherry", "banana", "Apple"]],
      ["File name (A to Z)", ["Alpha", "beta", "Apple", "banana", "cherry"]],
    ])("applies %s to the tree", async (label, expected) => {
      setup();
      await openSortMenu();
      await userEvent.click(screen.getByRole("menuitemradio", { name: label }));
      expect(rowNames()).toEqual(expected);
      const items = await openSortMenu();
      expect(items.filter((i) => i.getAttribute("aria-checked") === "true").map((i) => i.textContent)).toEqual([label]);
    });

    it("remembers the choice per vault", async () => {
      setup();
      await openSortMenu();
      await userEvent.click(screen.getByRole("menuitemradio", { name: "Created time (old to new)" }));
      expect(localStorage.getItem("maia.codex.sort:/v/one")).toBe("created-asc");
      expect(localStorage.getItem("maia.codex.sort:/v/two")).toBeNull();
      cleanup();
      setup({ vaultPath: "/v/two" });
      expect(rowNames().slice(2)).toEqual(["Apple", "banana", "cherry"]);
      cleanup();
      setup({ vaultPath: "/v/one" });
      expect(rowNames().slice(2)).toEqual(["cherry", "banana", "Apple"]);
    });

    it("opens from the keyboard and Escape returns focus to the button", async () => {
      setup();
      const button = screen.getByRole("button", { name: "Change sort order" });
      button.focus();
      await userEvent.keyboard("{Enter}");
      expect(await screen.findAllByRole("menuitemradio")).toHaveLength(6);
      await userEvent.keyboard("{Escape}");
      expect(screen.queryAllByRole("menuitemradio")).toHaveLength(0);
      expect(document.activeElement).toBe(button);
      await userEvent.keyboard("{ArrowDown}");
      expect(await screen.findAllByRole("menuitemradio")).toHaveLength(6);
    });
  });

  describe("collapse / expand all", () => {
    it("expands every folder (empty ones too), then collapses them all", async () => {
      setup();
      expect(toggleAll().getAttribute("aria-label")).toBe("Expand all");
      await userEvent.click(toggleAll());
      expect(screen.getAllByRole("treeitem").filter((r) => r.getAttribute("aria-expanded") === "true").map((r) => r.dataset.folderPath))
        .toEqual(["Alpha", "Alpha/Sub", "beta"]);
      expect(toggleAll().getAttribute("aria-label")).toBe("Collapse all");

      await userEvent.click(toggleAll());
      expect(rowNames().slice(0, 2)).toEqual(["Alpha", "beta"]);
      expect(screen.queryByText("Sub")).toBeNull();
      expect(toggleAll().getAttribute("aria-label")).toBe("Expand all");
      expect(JSON.parse(localStorage.getItem(EXPANDED_KEY))).toEqual([]);
    });

    it("collapses the ancestors of the open note too", async () => {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(["Alpha"]));
      setup({ notes: [...notes, { id: "x", title: "inside", folder: "Alpha" }], currentNoteId: "x" });
      expect(screen.queryByText("inside")).not.toBeNull();
      await userEvent.click(toggleAll());
      expect(screen.queryByText("inside")).toBeNull();
    });

    it("is disabled when the vault has no folders", () => {
      setup({ notes: [notes[0]], folders: [] });
      expect(toggleAll().hasAttribute("disabled")).toBe(true);
    });
  });
});
