// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MaiaShell } from "./MaiaShell.jsx";

vi.mock("@/features/Settings/useVault", () => ({
  useVault: () => ({ isDesktop: false, path: null, recents: [], isSwitching: false }),
}));

const history = { canBack: false, canForward: false, back: vi.fn(), forward: vi.fn() };

const setup = (props = {}) =>
  render(
    <MaiaShell currentPage="codex" onNavigate={vi.fn()} onOpenChronos={vi.fn()} onToggleSearch={vi.fn()} onOpenSettings={vi.fn()} history={history} {...props}>
      <p>page body</p>
    </MaiaShell>
  );

afterEach(cleanup);

describe("MaiaShell accessibility", () => {
  it("has the landmarks a screen reader jumps between", () => {
    setup();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Codex" })).toBeInTheDocument();
  });

  it("starts with a skip link that moves focus to the main region", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(document.activeElement).toBe(skip);
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("names every rail and top bar button, and marks the current page", () => {
    setup();
    const rail = screen.getByRole("navigation", { name: "Primary" });
    for (const name of ["Opus", "Codex", "Conexa", "Chronos", "Search", "Settings"]) {
      expect(within(rail).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(within(rail).getByRole("button", { name: "Codex" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Forward" })).toBeDisabled();
  });

  it("announces shortcuts on the rail", () => {
    setup();
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
  });
});
