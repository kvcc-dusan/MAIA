import { describe, it, expect } from "vitest";
import {
  cleanName, uniqueName, projectFolderName, taskFileName, questionFileName, shortenQuestion, MAX_NAME_LENGTH,
} from "./names.js";

describe("cleanName", () => {
  it("strips characters illegal on macOS and Windows and Obsidian-breaking ones", () => {
    expect(cleanName('a/b\\c:d*e?f"g<h>i|j#k^l[m]n')).toBe("a b c d e f g h i j k l m n");
  });
  it("keeps case, spaces and diacritics", () => {
    expect(cleanName("  Čas za  Plan  ")).toBe("Čas za Plan");
  });
  it("drops leading dots, trailing dots/spaces and control characters", () => {
    expect(cleanName("..hidden. ")).toBe("hidden");
    expect(cleanName("tab\there\nnow")).toBe("tab here now");
  });
  it("avoids Windows reserved device names", () => {
    expect(cleanName("CON")).toBe("CON item");
  });
  it("caps length at 80", () => {
    expect(cleanName("x".repeat(200))).toHaveLength(MAX_NAME_LENGTH);
  });
  it("returns an empty string for nothing usable", () => {
    expect(cleanName("???")).toBe("");
    expect(cleanName(undefined)).toBe("");
  });
});

describe("uniqueName", () => {
  it("adds ' 2', ' 3' on collisions, ignoring case", () => {
    expect(uniqueName("Plan", ["plan.md"], ".md")).toBe("Plan 2.md");
    expect(uniqueName("Plan", ["PLAN.md", "Plan 2.md"], ".md")).toBe("Plan 3.md");
  });
  it("keeps the suffixed name within 80 characters", () => {
    const base = "y".repeat(80);
    const out = uniqueName(base, [`${base}.md`], ".md");
    expect(out.replace(/\.md$/, "").length).toBeLessThanOrEqual(80);
    expect(out.endsWith(" 2.md")).toBe(true);
  });
  it("returns the plain name when free", () => {
    expect(uniqueName("Free", ["other.md"], ".md")).toBe("Free.md");
  });
});

describe("item names", () => {
  it("names project folders from the project name with collision handling", () => {
    expect(projectFolderName({ id: "p1", name: "Atlas" }, ["atlas"])).toBe("Atlas 2");
    expect(projectFolderName({ id: "pabcdef", name: "///" }, [])).toBe("Project pabcd");
  });
  it("names task files from the title", () => {
    expect(taskFileName({ id: "t1", title: "Fix: login?" }, [])).toBe("Fix login.md");
    expect(taskFileName({ id: "t1", title: "Fix" }, ["fix.md"])).toBe("Fix 2.md");
  });
  it("shortens questions at a word boundary and drops the question mark", () => {
    const q = "Which authentication provider should we use for the customer portal and the admin area going forward?";
    const short = shortenQuestion(q);
    expect(short.length).toBeLessThanOrEqual(60);
    expect(q.startsWith(short)).toBe(true);
    expect(short.endsWith(" ")).toBe(false);
    expect(questionFileName({ id: "q1", question: "Which auth?" }, [])).toBe("Which auth.md");
  });
});

describe("name safety", () => {
  const bytes = (s) => new TextEncoder().encode(s).length;

  it("keeps names under the 255-byte file name limit for multi-byte text", () => {
    const emoji = cleanName("😀".repeat(80));
    expect(bytes(emoji)).toBeLessThanOrEqual(180);
    expect(emoji).not.toMatch(/�/);
    const cjk = uniqueName(cleanName("日".repeat(80)), [`${cleanName("日".repeat(80))}.md`], ".md");
    expect(bytes(cjk)).toBeLessThanOrEqual(190);
  });

  it("treats NFC and NFD spellings as the same name (APFS does)", () => {
    expect(uniqueName("Café", ["Café.md"].map((n) => n.replace(".md", "")))).toBe("Café 2");
    expect(uniqueName("Café", ["Café.md"], ".md")).toBe("Café 2.md");
  });

  it("never leaves a leading dot after separators are removed", () => {
    expect(cleanName("../../escape")).toBe("escape");
    expect(cleanName("..\\.. /x")).toBe("x");
    expect(cleanName(". . .")).toBe("");
  });

  it("removes bidi override and line separator characters", () => {
    expect(cleanName("report‮fdp.md")).toBe("report fdp.md");
    expect(cleanName("a b")).toBe("a b");
  });
});
