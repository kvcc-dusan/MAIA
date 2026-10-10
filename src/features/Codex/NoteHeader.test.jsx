// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import NoteHeader from "./NoteHeader.jsx";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const setup = (props = {}) =>
  render(<NoteHeader title="Plan" createdAt={0} content="x" isEditing onToggleMode={vi.fn()} onToggleView={vi.fn()} onDelete={vi.fn()} {...props} />);

afterEach(cleanup);

describe("NoteHeader accessibility", () => {
  it("names the mode toggle by the action it performs", () => {
    setup({ isEditing: true });
    expect(screen.getByRole("button", { name: "Switch to reading mode" })).toBeInTheDocument();
    cleanup();
    setup({ isEditing: false });
    expect(screen.getByRole("button", { name: "Switch to editing mode" })).toBeInTheDocument();
  });

  it("opens a labelled menu by keyboard and confirms deletion in a dialog that starts on Cancel", async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole("button", { name: "More" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "Delete note" }));
    expect(await screen.findByRole("dialog", { name: 'Delete "Plan"?' })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
  });
});
