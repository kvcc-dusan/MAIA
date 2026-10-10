// @vitest-environment jsdom
import React, { useState } from "react";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import PropertiesPanel from "./PropertiesPanel.jsx";
import { PROPERTY_FIELDS } from "./propertyTypes.js";
import { markdownToNote, noteToMarkdown } from "@/lib/noteFile";

// Same merge EditorPage does, so the test sees what would be saved
function Harness({ source, isEditable = true, onSave }) {
  const [note, setNote] = useState(() => markdownToNote(source, { fallbackId: "n1", fallbackTitle: "Plan" }));
  const change = (next) => {
    setNote((v) => {
      const merged = { ...v, ...Object.fromEntries(PROPERTY_FIELDS.filter((f) => Object.hasOwn(next, f)).map((f) => [f, next[f]])) };
      onSave?.(noteToMarkdown(merged));
      return merged;
    });
  };
  return <PropertiesPanel note={note} onChange={change} isEditable={isEditable} />;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const SOURCE = "---\nid: n1\ntitle: Plan\nstatus: draft\ntags: [alpha]\ndone: false\ndue: 2026-07-13\ncount: 3\n---\nbody";

describe("PropertiesPanel", () => {
  it("shows a labelled group with a row per visible key and hides MAIA keys", () => {
    render(<Harness source={SOURCE} />);
    const group = screen.getByRole("group", { name: "Properties" });
    ["status", "tags", "done", "due", "count"].forEach((key) => expect(within(group).getAllByText(key).length).toBeGreaterThan(0));
    expect(within(group).queryByText("id")).toBeNull();
    expect(within(group).queryByText("createdAt")).toBeNull();
    expect(within(group).getByText("#alpha")).toBeTruthy();
  });

  it("shows only an add button on a note without properties", () => {
    render(<Harness source="just a body" />);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("button", { name: /add property/i })).toBeTruthy();
  });

  it("renders nothing for a read-only note without properties", () => {
    const { container } = render(<Harness source="just a body" isEditable={false} />);
    expect(container.textContent).toBe("");
  });

  it("collapses and remembers it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness source={SOURCE} />);
    const toggle = screen.getByRole("button", { name: "Properties" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    unmount();
    render(<Harness source={SOURCE} />);
    expect(screen.getByRole("button", { name: "Properties" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("edits text inline: Enter commits and only that line changes", async () => {
    const user = userEvent.setup();
    let saved = "";
    render(<Harness source={SOURCE} onSave={(t) => { saved = t; }} />);
    await user.click(screen.getByRole("button", { name: "Edit status" }));
    const input = screen.getByRole("textbox", { name: "status" });
    await user.clear(input);
    await user.type(input, "done{Enter}");
    expect(saved).toBe(SOURCE.replace("status: draft", "status: done"));
    expect(screen.getByRole("button", { name: "Edit status" }).textContent).toBe("done");
  });

  it("Escape cancels an inline edit", async () => {
    const user = userEvent.setup();
    let saved = null;
    render(<Harness source={SOURCE} onSave={(t) => { saved = t; }} />);
    await user.click(screen.getByRole("button", { name: "Edit status" }));
    await user.type(screen.getByRole("textbox", { name: "status" }), "x{Escape}");
    expect(saved).toBeNull();
    expect(screen.getByRole("button", { name: "Edit status" }).textContent).toBe("draft");
  });

  it("rejects a non-number in a number property", async () => {
    const user = userEvent.setup();
    let saved = null;
    render(<Harness source={SOURCE} onSave={(t) => { saved = t; }} />);
    await user.click(screen.getByRole("button", { name: "Edit count" }));
    const input = screen.getByRole("textbox", { name: "count" });
    await user.clear(input);
    await user.type(input, "abc{Enter}");
    expect(saved).toBeNull();
    expect(screen.getByText("Enter a number")).toBeTruthy();
  });

  it("toggles a checkbox", async () => {
    const user = userEvent.setup();
    let saved = "";
    render(<Harness source={SOURCE} onSave={(t) => { saved = t; }} />);
    await user.click(screen.getByRole("checkbox", { name: "done" }));
    expect(saved).toContain("done: true");
  });

  it("adds and removes tags, stripping #", async () => {
    const user = userEvent.setup();
    let saved = "";
    render(<Harness source={SOURCE} onSave={(t) => { saved = t; }} />);
    await user.type(screen.getByRole("textbox", { name: "Add to tags" }), "#beta{Enter}");
    expect(saved).toContain("tags: [alpha, beta]");
    expect(screen.getByText("#beta")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove #alpha from tags" }));
    expect(saved).toContain("tags: [beta]");
  });

  it("adds a property with a name and a type, and refuses bad names", async () => {
    const user = userEvent.setup();
    let saved = "";
    render(<Harness source="body" onSave={(t) => { saved = t; }} />);
    await user.click(screen.getByRole("button", { name: /add property/i }));
    const name = screen.getByRole("textbox", { name: "Property name" });
    await user.type(name, "id{Enter}");
    expect(screen.getByText("That name is used by MAIA")).toBeTruthy();
    await user.clear(name);
    await user.type(name, "tags{Enter}");
    expect(saved).toBe("---\ntags: []\n---\nbody");
    expect(screen.getByRole("group", { name: "Properties" })).toBeTruthy();
  });

  it("removes an empty property at once and asks before removing one with a value", async () => {
    const user = userEvent.setup();
    let saved = "";
    render(<Harness source={"---\nempty:\nname: Lea\n---\nbody"} onSave={(t) => { saved = t; }} />);

    await user.click(screen.getByRole("button", { name: "Options for empty" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove property" }));
    expect(saved).toBe("---\nname: Lea\n---\nbody");

    await user.click(screen.getByRole("button", { name: "Options for name" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove property" }));
    expect(saved).toBe("---\nname: Lea\n---\nbody");
    await user.click(await screen.findByRole("button", { name: "Remove property" }));
    expect(saved).toBe("body");
  });

  it("renames a property", async () => {
    const user = userEvent.setup();
    let saved = "";
    render(<Harness source={"---\nname: Lea\n---\nbody"} onSave={(t) => { saved = t; }} />);
    await user.click(screen.getByRole("button", { name: "Options for name" }));
    await user.click(await screen.findByRole("menuitem", { name: "Rename property" }));
    const input = screen.getByRole("textbox", { name: "Rename name" });
    await user.clear(input);
    await user.type(input, "owner2{Enter}");
    expect(saved).toBe("---\nowner2: Lea\n---\nbody");
  });

  it("leaves values it cannot edit alone and says so", () => {
    render(<Harness source={"---\nsummary: |\n  one\n  two\n---\nbody"} />);
    expect(screen.getByText(/Too complex to edit here/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit summary" })).toBeNull();
  });

  it("does not touch frontmatter it cannot read", () => {
    render(<Harness source={"---\nnot a mapping line\n---\nbody"} />);
    expect(screen.getByRole("status").textContent).toMatch(/could not be read/);
    expect(screen.queryByRole("button", { name: /add property/i })).toBeNull();
  });

  it("is read-only when the note is", () => {
    render(<Harness source={SOURCE} isEditable={false} />);
    expect(screen.queryByRole("button", { name: /add property/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit status" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Options for/ })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "done" }).hasAttribute("disabled")).toBe(true);
  });
});
