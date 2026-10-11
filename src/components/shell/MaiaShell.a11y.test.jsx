// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MaiaShell } from "./MaiaShell.jsx";
import { ShellSidebar } from "./ShellContext.jsx";

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

describe("MaiaShell top bar structure", () => {
  // A page fills the sidebar by rendering <ShellSidebar>; only then does the shell show the toggle.
  const withSidebar = () => render(
    <MaiaShell currentPage="codex" onNavigate={vi.fn()} onOpenChronos={vi.fn()} onToggleSearch={vi.fn()} onOpenSettings={vi.fn()} history={history}>
      <ShellSidebar><p>side</p></ShellSidebar>
      <p>page body</p>
    </MaiaShell>
  );
  const buttonNames = (el) => within(el).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);

  it("puts back and forward first and the sidebar toggle last in the cluster", () => {
    withSidebar();
    const cluster = screen.getByTestId("shell-cluster");
    expect(buttonNames(cluster)).toEqual(["Back", "Forward", "Hide sidebar"]);
  });

  it("marks the cluster while the sidebar is open and clears it when it closes", async () => {
    const user = userEvent.setup();
    withSidebar();
    const cluster = screen.getByTestId("shell-cluster");
    expect(cluster).toHaveAttribute("data-sidebar-open");
    await user.click(screen.getByRole("button", { name: "Hide sidebar" }));
    expect(cluster).not.toHaveAttribute("data-sidebar-open");
    expect(screen.getByRole("button", { name: "Show sidebar" })).toBeInTheDocument();
  });

  it("keeps the tab strip as the cluster's next sibling so the divider overlap rule applies", () => {
    withSidebar();
    expect(screen.getByTestId("shell-cluster").nextElementSibling).toBe(screen.getByTestId("shell-strip"));
  });
});
