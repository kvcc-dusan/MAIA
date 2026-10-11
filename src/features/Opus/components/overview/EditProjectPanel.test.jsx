// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import EditProjectPanel from "./EditProjectPanel.jsx";

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

afterEach(cleanup);

const open = (project) => render(<EditProjectPanel open project={project} onClose={vi.fn()} onSave={vi.fn()} />);

describe("EditProjectPanel", () => {
  it("opens with a normal project", () => {
    open({ id: "p", name: "Seed Test", phase: "Build", headline: "Hi", focus: "", startDate: "2026-09-01", targetDate: "2026-12-15", nextMeeting: "2026-10-14T09:00" });
    expect(screen.getByRole("dialog", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Seed Test")).toBeInTheDocument();
  });

  it("opens when a hand-edited file gives numbers, dates or nothing instead of strings", () => {
    open({ id: "p", name: 2026, phase: 3, headline: new Date("2026-10-01"), focus: null, startDate: new Date("2026-09-01"), targetDate: 20261215, nextMeeting: new Date("nope") });
    expect(screen.getByRole("dialog", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026")).toBeInTheDocument();
  });
});
