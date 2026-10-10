import { describe, it, expect } from "vitest";
import { splitFrontmatter, parseFrontmatter, stringifyFile, patchFile } from "./yamlFrontmatter.js";

describe("splitFrontmatter", () => {
  it("splits frontmatter from body and normalizes CRLF", () => {
    const parts = splitFrontmatter("---\r\nid: a\r\n---\r\nBody\r\n");
    expect(parts).toEqual({ hasFrontmatter: true, yaml: "id: a", body: "Body\n" });
  });

  it("treats a file without a block as body only", () => {
    expect(splitFrontmatter("# just text\n")).toEqual({ hasFrontmatter: false, yaml: "", body: "# just text\n" });
  });

  it("handles an empty block and a leading BOM", () => {
    expect(splitFrontmatter("﻿---\n---\nx").hasFrontmatter).toBe(true);
  });

  it("does not mistake a later horizontal rule for the closing fence", () => {
    const parts = splitFrontmatter("---\nid: a\n---\ntext\n---\nmore\n");
    expect(parts.yaml).toBe("id: a");
    expect(parts.body).toBe("text\n---\nmore\n");
  });
});

describe("parseFrontmatter", () => {
  it("returns plain data and keeps dates as strings", () => {
    const r = parseFrontmatter("---\nid: a\ndue: 2026-10-01\norder: 3\n---\n");
    expect(r).toMatchObject({ ok: true, data: { id: "a", due: "2026-10-01", order: 3 } });
  });

  it("never throws on bad YAML", () => {
    const r = parseFrontmatter("---\nid: [unclosed\n  - : :\n---\nbody");
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("rejects duplicate keys and non-mapping frontmatter", () => {
    expect(parseFrontmatter("---\nid: a\nid: b\n---\n").ok).toBe(false);
    expect(parseFrontmatter("---\n- a\n- b\n---\n").ok).toBe(false);
  });

  it("drops prototype-polluting keys", () => {
    const r = parseFrontmatter("---\n__proto__: x\nid: a\n---\n");
    expect(r.ok).toBe(true);
    expect(Object.keys(r.data)).toEqual(["id"]);
  });

  it("copes with non-string input", () => {
    expect(parseFrontmatter(undefined)).toMatchObject({ ok: true, data: {} });
  });
});

describe("stringifyFile / patchFile", () => {
  it("writes keys in the given order and omits empty values", () => {
    const text = stringifyFile({ id: "a", title: "T", owner: "", tags: [], n: 0 }, "Body");
    expect(text).toBe("---\nid: a\ntitle: T\nn: 0\n---\n\nBody\n");
  });

  it("quotes values that would otherwise change type", () => {
    const text = stringifyFile({ id: "a", title: "yes", n: "123" });
    expect(parseFrontmatter(text).data).toEqual({ id: "a", title: "yes", n: "123" });
  });

  it("returns an untouched source unchanged (CRLF normalized)", () => {
    const src = "---\r\n# keep me\r\nid: a   # trailing\r\ntitle: 'T'\r\n---\r\n\r\nBody\r\n";
    const out = patchFile(src, { fields: { id: "a", title: "T" }, baseFields: { id: "a", title: "T" }, body: "Body", baseBody: "Body" });
    expect(out).toBe(src.replace(/\r\n/g, "\n"));
  });

  it("changes only the edited key and keeps comments and unknown keys", () => {
    const src = "---\n# note\nid: a\ntitle: 'T'  # why\nfoo: bar\n---\n\nBody\n";
    const out = patchFile(src, {
      fields: { id: "a", title: "New", foo: "bar" },
      baseFields: { id: "a", title: "T", foo: "bar" },
      body: "Body",
      baseBody: "Body",
    });
    expect(out).toContain("# note");
    expect(out).toContain("foo: bar");
    expect(out).toMatch(/title: .New. +# why/);
    expect(out.endsWith("---\n\nBody\n")).toBe(true);
  });

  it("builds a full block when the source had no frontmatter", () => {
    const out = patchFile("plain text\n", { fields: { id: "a" }, baseFields: { id: "a" }, body: "plain text", baseBody: "plain text" });
    expect(out).toBe("plain text\n");
    const changed = patchFile("plain text\n", { fields: { id: "a", title: "x" }, baseFields: { id: "a" }, body: "plain text", baseBody: "plain text" });
    expect(changed).toBe("---\nid: a\ntitle: x\n---\n\nplain text\n");
  });
});

describe("hostile frontmatter", () => {
  it("rejects an oversized block fast instead of freezing the app (yaml parsing is quadratic in keys)", () => {
    const yamlText = Array.from({ length: 20000 }, (_, i) => `k${i}: ${i}`).join("\n");
    const started = Date.now();
    const result = parseFrontmatter(`---\n${yamlText}\n---\nbody`);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too large/i);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("strips prototype keys at any depth", () => {
    const result = parseFrontmatter("---\nok: 1\nnested:\n  __proto__:\n    polluted: true\n  fine: 2\nlist:\n  - constructor: x\n    keep: y\n---\n");
    expect(result.ok).toBe(true);
    expect(Object.keys(result.data.nested)).toEqual(["fine"]);
    expect(result.data.list).toEqual([{ keep: "y" }]);
    expect({}.polluted).toBeUndefined();
  });

  it("refuses alias bombs without throwing", () => {
    let yamlText = "a0: &a0 [x,x,x,x,x,x,x,x,x,x]\n";
    for (let i = 1; i < 10; i += 1) yamlText += `a${i}: &a${i} [${Array(10).fill(`*a${i - 1}`).join(",")}]\n`;
    expect(parseFrontmatter(`---\n${yamlText}---\n`).ok).toBe(false);
  });
});
