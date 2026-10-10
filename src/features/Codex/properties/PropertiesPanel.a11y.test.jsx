// @vitest-environment jsdom
import React, { useState } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import PropertiesPanel from "./PropertiesPanel.jsx";
import { PROPERTY_FIELDS } from "./propertyTypes.js";
import { markdownToNote } from "@/lib/noteFile";

function Harness({ source }) {
  const [note, setNote] = useState(() => markdownToNote(source, { fallbackId: "n1", fallbackTitle: "Plan" }));
  const change = (next) =>
    setNote((v) => ({ ...v, ...Object.fromEntries(PROPERTY_FIELDS.filter((f) => Object.hasOwn(next, f)).map((f) => [f, next[f]])) }));
  return <PropertiesPanel note={note} onChange={change} isEditable />;
}

const SOURCE = "---\nid: n1\ntitle: Plan\nstatus: draft\ntags: [alpha]\ncount: 3\n---\nbody";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("PropertiesPanel accessibility", () => {
  it("has a heading inside a labelled group, and a labelled group per list", () => {
    render(<Harness source={SOURCE} />);
    expect(screen.getByRole("heading", { name: "Properties", level: 2 })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Properties" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "tags" })).toBeTruthy();
  });

  it("names every value control after its property", async () => {
    const user = userEvent.setup();
    render(<Harness source={SOURCE} />);
    await user.click(screen.getByRole("button", { name: "Edit status" }));
    expect(screen.getByRole("textbox", { name: "status" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Add to tags" })).toBeTruthy();
  });

  it("exposes the current value as the description of the edit button", () => {
    render(<Harness source={SOURCE} />);
    const button = screen.getByRole("button", { name: "Edit status" });
    expect(button.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(button.getAttribute("aria-describedby")).textContent).toBe("Value: draft");
  });

  it("documents Enter and Escape on inline editors", async () => {
    const user = userEvent.setup();
    render(<Harness source={SOURCE} />);
    await user.click(screen.getByRole("button", { name: "Edit status" }));
    expect(screen.getByRole("textbox", { name: "status" }).getAttribute("aria-keyshortcuts")).toBe("Enter Escape");
  });

  it("announces chip changes in a polite status region", async () => {
    const user = userEvent.setup();
    render(<Harness source={SOURCE} />);
    const group = screen.getByRole("group", { name: "tags" });
    const region = group.querySelector('[role="status"]');
    expect(region.getAttribute("aria-live")).toBe("polite");
    await user.type(screen.getByRole("textbox", { name: "Add to tags" }), "beta{Enter}");
    expect(region.textContent).toBe("Added #beta to tags. 2 items.");
    await user.click(screen.getByRole("button", { name: "Remove #beta from tags" }));
    expect(region.textContent).toBe("Removed #beta from tags. 1 item.");
  });

  it("keeps focus in the list after removing a chip", async () => {
    const user = userEvent.setup();
    render(<Harness source={SOURCE} />);
    await user.click(screen.getByRole("button", { name: "Remove #alpha from tags" }));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Add to tags" }));
  });

  it("ties an input error to the field and announces it", async () => {
    const user = userEvent.setup();
    render(<Harness source="body" />);
    await user.click(screen.getByRole("button", { name: /add property/i }));
    const name = screen.getByRole("textbox", { name: "Property name" });
    await user.type(name, "id{Enter}");
    const message = await screen.findByText("That name is used by MAIA");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(name.getAttribute("aria-describedby").split(" ").at(-1))).toBe(message.closest("[id]"));
    expect(message.closest('[role="alert"]')).toBeTruthy();
  });

  it("returns focus to Add property when the form is cancelled with Escape", async () => {
    const user = userEvent.setup();
    render(<Harness source="body" />);
    await user.click(screen.getByRole("button", { name: /add property/i }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /add property/i })));
  });

  it("confirms removal in a labelled dialog that opens on Cancel, then lands focus on the panel", async () => {
    const user = userEvent.setup();
    render(<Harness source={SOURCE} />);
    await user.click(screen.getByRole("button", { name: "Options for status" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove property" }));
    const dialog = await screen.findByRole("dialog", { name: "Remove status?" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    await user.click(screen.getByRole("button", { name: "Remove property" }));
    await waitFor(() => expect(dialog.isConnected).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Properties" })));
  });
});
