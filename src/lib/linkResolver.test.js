import { describe, it, expect } from "vitest";
import { createLinkResolver, linkKey } from "./linkResolver.js";

const note = (id, title, folder = "", fileName) => ({ id, title, folder, ...(fileName ? { fileName } : {}) });

describe("linkKey", () => {
  it("drops alias, heading, .md and surrounding slashes, and lowercases", () => {
    expect(linkKey("  Cosmos/01-Reading-Path#COS-F-04  ")).toBe("cosmos/01-reading-path");
    expect(linkKey("Note|shown text")).toBe("note");
    expect(linkKey("/folder\\Note.md/")).toBe("folder/note");
  });

  it("is empty for a same-note heading link or nothing", () => {
    expect(linkKey("#F5 Ryle 1949")).toBe("");
    expect(linkKey("  ")).toBe("");
    expect(linkKey(undefined)).toBe("");
  });
});

describe("createLinkResolver", () => {
  it("matches a title, ignoring case, spacing, alias and heading", () => {
    const alpha = note("a", "Alpha");
    const resolve = createLinkResolver([alpha, note("b", "Beta")]);
    expect(resolve("alpha")).toBe(alpha);
    expect(resolve("  ALPHA#Part|text ")).toBe(alpha);
    expect(resolve("Gamma")).toBeUndefined();
  });

  it("matches a file name when the title differs from it", () => {
    const overview = note("o", "COSMOS — Overview", "cosmos", "00-overview");
    expect(createLinkResolver([overview])("00-overview")).toBe(overview);
  });

  it("prefers a title over a file name for a bare name", () => {
    const byTitle = note("t", "Plan", "x", "something");
    const byFile = note("f", "Other", "y", "plan");
    expect(createLinkResolver([byFile, byTitle])("plan")).toBe(byTitle);
  });

  it("resolves a folder path against the end of the note's vault path", () => {
    const deep = note("d", "COSMOS — Reading path", "Projects/Speculum Mundi/cosmos", "01-reading-path");
    const resolve = createLinkResolver([deep, note("m", "MIND — Reading path", "Projects/Speculum Mundi/mind", "01-reading-path")]);
    expect(resolve("cosmos/01-reading-path#COS-F-04")).toBe(deep);
    expect(resolve("Speculum Mundi/cosmos/01-reading-path")).toBe(deep);
    expect(resolve("Projects/Speculum Mundi/cosmos/01-reading-path.md")).toBe(deep);
  });

  it("does not match a path that only shares the file name or a partial folder name", () => {
    const resolve = createLinkResolver([note("d", "Deep", "a/mycosmos", "overview")]);
    expect(resolve("cosmos/overview")).toBeUndefined();
    expect(resolve("other/overview")).toBeUndefined();
  });

  it("falls back to a title that contains a slash", () => {
    const acdc = note("a", "AC/DC");
    expect(createLinkResolver([acdc])("ac/dc")).toBe(acdc);
  });

  it("gives same-named notes in different folders their own targets by path", () => {
    const cosmos = note("c", "COSMOS — Bridges", "sm/cosmos", "03-bridges");
    const mind = note("m", "MIND — Bridges", "sm/mind", "03-bridges");
    const resolve = createLinkResolver([cosmos, mind]);
    expect(resolve("cosmos/03-bridges")).toBe(cosmos);
    expect(resolve("mind/03-bridges")).toBe(mind);
  });

  it("picks the closest same-named note for a bare name, then the shallowest, then the path", () => {
    const cosmos = note("c", "COSMOS — Overview", "sm/cosmos", "00-overview");
    const mind = note("m", "MIND — Overview", "sm/mind", "00-overview");
    const resolve = createLinkResolver([cosmos, mind]);
    expect(resolve("00-overview", note("x", "X", "sm/mind"))).toBe(mind);
    expect(resolve("00-overview", note("x", "X", "sm/cosmos"))).toBe(cosmos);

    const shallow = note("s", "Shallow", "a", "dup");
    const deep = note("p", "Deep", "a/b/c", "dup");
    expect(createLinkResolver([deep, shallow])("dup", note("x", "X", "elsewhere"))).toBe(shallow);

    const first = note("1", "One", "a", "same");
    const second = note("2", "Two", "b", "same");
    expect(createLinkResolver([second, first])("same")).toBe(first);
  });

  it("works for notes with no folder or file name (web build)", () => {
    const loose = note("l", "Loose");
    expect(createLinkResolver([loose])("Loose")).toBe(loose);
  });

  it("returns nothing for an empty target and tolerates missing data", () => {
    const resolve = createLinkResolver([note("a", "Alpha")]);
    expect(resolve("#Heading")).toBeUndefined();
    expect(resolve("")).toBeUndefined();
    expect(createLinkResolver(undefined)("Alpha")).toBeUndefined();
    expect(createLinkResolver([{ id: "x" }])("anything")).toBeUndefined();
  });
});
