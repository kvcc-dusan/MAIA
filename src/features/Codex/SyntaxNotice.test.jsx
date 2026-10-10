// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import SyntaxNotice from "./SyntaxNotice.jsx";

afterEach(cleanup);

describe("SyntaxNotice accessibility", () => {
  it("announces the safe-note Source mode banner politely, without interrupting", () => {
    render(<SyntaxNotice isSource isSafe onSwitchView={vi.fn()} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Source mode");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the unsafe-syntax warning a status too, and its action is a named button", async () => {
    const user = userEvent.setup();
    const onSwitchView = vi.fn();
    render(<SyntaxNotice isSource={false} reasons={[{ label: "footnotes" }]} onSwitchView={onSwitchView} />);
    expect(screen.getByRole("status")).toHaveTextContent("footnotes");
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Back to source" }));
    expect(onSwitchView).toHaveBeenCalled();
  });
});
