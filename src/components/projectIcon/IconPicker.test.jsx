// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import IconPicker from "./IconPicker";
import { ICONS } from "./icons";
import { ICON_COLORS, PICKER_ICONS } from "@/lib/projectIcons.js";

const setup = (props = {}) => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(<IconPicker currentIcon="code" currentColor="white" onSelect={onSelect} onClose={onClose} {...props} />);
  return { onSelect, onClose };
};

describe("IconPicker", () => {
  afterEach(cleanup);

  it("offers 24 icons that all have artwork, and Arc's 8 colours", () => {
    expect(PICKER_ICONS).toHaveLength(24);
    PICKER_ICONS.forEach((icon) => expect(ICONS[icon.id], icon.id).toBeDefined());
    setup();
    const icons = within(screen.getByRole("radiogroup", { name: "Icon" })).getAllByRole("radio");
    const colors = within(screen.getByRole("radiogroup", { name: "Color" })).getAllByRole("radio");
    expect(icons).toHaveLength(24);
    expect(colors).toHaveLength(ICON_COLORS.length);
    expect(ICON_COLORS.map((c) => c.id)).toEqual(["white", "violet", "blue", "green", "amber", "orange", "coral", "rose"]);
  });

  it("keeps one Tab stop per group and moves with the arrow keys", () => {
    setup();
    const group = screen.getByRole("radiogroup", { name: "Icon" });
    const code = within(group).getByRole("radio", { name: "Code" });
    expect(code).toHaveAttribute("aria-checked", "true");
    expect(within(group).getAllByRole("radio").filter((r) => r.tabIndex === 0)).toHaveLength(1);
    fireEvent.keyDown(code, { key: "ArrowDown" }); // one row down: Black hole
    expect(within(group).getByRole("radio", { name: "Black hole" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(within(group).getByRole("radio", { name: "Black hole" }), { key: "ArrowRight" });
    expect(within(group).getByRole("radio", { name: "Design" })).toHaveAttribute("aria-checked", "true");
  });

  it("applies the chosen icon and colour", () => {
    const { onSelect, onClose } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Earth" }));
    fireEvent.click(screen.getByRole("radio", { name: "Violet" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply icon" }));
    expect(onSelect).toHaveBeenCalledWith("earth", "violet");
    expect(onClose).toHaveBeenCalled();
  });

  it("still opens for a project with an older icon outside the set", () => {
    setup({ currentIcon: "global" });
    const group = screen.getByRole("radiogroup", { name: "Icon" });
    expect(within(group).getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(0);
    expect(within(group).getByRole("radio", { name: "Code" }).tabIndex).toBe(0);
  });
});
