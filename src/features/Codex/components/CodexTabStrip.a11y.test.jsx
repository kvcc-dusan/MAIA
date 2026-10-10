// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(first).toHaveAttribute("aria-keyshortcuts", "Delete Backspace");
    first.focus();
    await user.keyboard("{Delete}");
    expect(onClose).toHaveBeenCalledWith("t1");
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
