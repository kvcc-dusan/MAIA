// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import CodexTabStrip from "./CodexTabStrip.jsx";
import { CODEX_PANEL_ID } from "./tabIds.js";

const notes = [
  { id: "a", title: "Alpha" },
  { id: "b", title: "Beta" },
];
const tabs = [
  { id: "t1", kind: "note", noteId: "a" },
  { id: "t2", kind: "note", noteId: "b" },
  { id: "t3", kind: "new" },
];

const setup = (activeId = "t1") => {
  const handlers = { onActivate: vi.fn(), onClose: vi.fn(), onNewTab: vi.fn() };
  render(<CodexTabStrip tabs={tabs} activeId={activeId} notes={notes} {...handlers} />);
  return handlers;
};

afterEach(cleanup);

describe("CodexTabStrip accessibility", () => {
  it("is a named tablist with selected state, one tab stop and a panel link", () => {
    setup();
    expect(screen.getByRole("tablist", { name: "Codex tabs" })).toBeInTheDocument();
    const [first, second] = screen.getAllByRole("tab");
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("aria-controls", CODEX_PANEL_ID);
    expect(second).toHaveAttribute("aria-selected", "false");
    expect(second).not.toHaveAttribute("aria-controls");
    expect(screen.getAllByRole("tab").filter((t) => t.tabIndex === 0)).toHaveLength(1);
  });

  it("moves between tabs with arrows, wrapping, Home and End", async () => {
    const user = userEvent.setup();
    setup();
    const [first, second, third] = screen.getAllByRole("tab");
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(second);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(third);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(first);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(third);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(first);
  });

  it("closes the focused tab with Delete, and says so", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    const [first] = screen.getAllByRole("tab");
    expect(first).toHaveAttribute("aria-keyshortcuts", "Delete");
    first.focus();
    await user.keyboard("{Delete}");
    expect(onClose).toHaveBeenCalledWith("t1");
  });

  it("does not close a tab on Backspace", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    const [first] = screen.getAllByRole("tab");
    first.focus();
    await user.keyboard("{Backspace}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("names each close button after its tab and still lets a pointer or switch user close it", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Close Beta" }));
    expect(onClose).toHaveBeenCalledWith("t2");
    expect(screen.getByRole("button", { name: "New tab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All tabs" })).toBeInTheDocument();
  });
});

// jsdom has no layout: give each tab a 100px slot so dnd-kit can find neighbours.
const TAB_WIDTH = 100;
const stubSlots = () => vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function slot() {
  const list = this.parentElement;
  const index = list?.getAttribute("role") === "tablist" ? Array.from(list.children).indexOf(this) : -1;
  const left = Math.max(index, 0) * TAB_WIDTH;
  return { x: left, y: 0, left, top: 0, right: left + TAB_WIDTH, bottom: 40, width: TAB_WIDTH, height: 40, toJSON: () => ({}) };
});

describe("CodexTabStrip keyboard reorder", () => {
  let slots;
  beforeEach(() => {
    slots = stubSlots();
  });
  afterEach(() => {
    slots.mockRestore();
  });

  const setupReorder = () => {
    const handlers = { onActivate: vi.fn(), onClose: vi.fn(), onNewTab: vi.fn(), onMove: vi.fn() };
    render(<CodexTabStrip tabs={tabs} activeId="t1" notes={notes} {...handlers} />);
    return handlers;
  };

  it("moves a tab right: Space picks it up, arrows move it, Space drops it", async () => {
    const user = userEvent.setup();
    const { onMove, onActivate } = setupReorder();
    const [first] = screen.getAllByRole("tab");
    first.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    expect(onMove).toHaveBeenCalledWith("t1", "t2");
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("moves a tab left, and opens the tab it moved", async () => {
    const user = userEvent.setup();
    const { onMove, onActivate } = setupReorder();
    const third = screen.getByRole("tab", { name: "New tab" });
    third.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowLeft}");
    await user.keyboard(" ");
    expect(onMove).toHaveBeenCalledWith("t3", "t1");
    expect(onActivate).toHaveBeenCalledWith("t3");
  });

  it("keeps focus on the dragged tab while arrows move it", async () => {
    const user = userEvent.setup();
    setupReorder();
    const [first, second] = screen.getAllByRole("tab");
    first.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(first);
    expect(document.activeElement).not.toBe(second);
  });

  it("cancels with Escape without moving or activating", async () => {
    const user = userEvent.setup();
    const { onMove, onActivate } = setupReorder();
    const [first] = screen.getAllByRole("tab");
    first.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");
    expect(onMove).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("treats Space to pick up and Space to drop with no move as an activation", async () => {
    const user = userEvent.setup();
    const { onMove, onActivate } = setupReorder();
    const second = screen.getAllByRole("tab")[1];
    second.focus();
    await user.keyboard(" ");
    await user.keyboard(" ");
    expect(onMove).not.toHaveBeenCalled();
    expect(onActivate).toHaveBeenCalledWith("t2");
  });

  it("announces the pick up and the drop in plain English", async () => {
    const user = userEvent.setup();
    setupReorder();
    const [first] = screen.getAllByRole("tab");
    first.focus();
    await user.keyboard(" ");
    expect(await screen.findByText("Picked up Alpha, position 1 of 3.")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Alpha is now at position 2 of 3.")).toBeInTheDocument();
    await user.keyboard(" ");
    expect(await screen.findByText("Dropped Alpha at position 2 of 3.")).toBeInTheDocument();
  });

  it("keeps the new tab and overflow controls out of the sortable list", () => {
    setupReorder();
    const scroller = screen.getByRole("tablist");
    expect(scroller.querySelectorAll("[role=tab]")).toHaveLength(3);
    expect(scroller.querySelector('button[aria-label="New tab"]')).toBeNull();
    expect(screen.getByRole("button", { name: "New tab" })).toBeInTheDocument();
  });

  it("never puts the window drag region on a tab", () => {
    setupReorder();
    screen.getAllByRole("tab").forEach((tab) => {
      expect(tab.closest("[data-tauri-drag-region]")).toBeNull();
    });
  });
});
