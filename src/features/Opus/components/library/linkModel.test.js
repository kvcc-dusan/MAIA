import { describe, it, expect } from "vitest";
import {
  LINK_ERRORS,
  parseLink,
  isSafeHref,
  isMailto,
  hostOf,
  linkTypeFor,
  linkLabel,
  groupLinks,
} from "./linkModel.js";

describe("parseLink", () => {
  it("adds https:// to a bare domain and derives title and type from the host", () => {
    expect(parseLink("figma.com/file/abc")).toEqual({
      link: { url: "https://figma.com/file/abc", title: "figma.com", type: "design" },
    });
  });

  it("keeps an explicit http or https scheme and strips www from the title", () => {
    expect(parseLink("http://www.example.com/a").link).toEqual({
      url: "http://www.example.com/a",
      title: "example.com",
      type: "other",
    });
    expect(parseLink("  https://github.com/org/repo  ").link.url).toBe("https://github.com/org/repo");
  });

  it("is not fooled by hosts that start with 'http'", () => {
    expect(parseLink("httpbin.org").link.url).toBe("https://httpbin.org");
  });

  it("rejects an empty value with a fix hint", () => {
    expect(parseLink("   ")).toEqual({ error: LINK_ERRORS.empty });
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://example.com/x",
    "vbscript:msgbox(1)",
    "tel:+38640123456",
  ])("rejects the unsupported scheme in %s", (input) => {
    expect(parseLink(input)).toEqual({ error: LINK_ERRORS.unsupported });
  });

  it("rejects hosts without a dot, as before", () => {
    expect(parseLink("localhost")).toEqual({ error: LINK_ERRORS.invalid });
    expect(parseLink("localhost:3000")).toEqual({ error: LINK_ERRORS.invalid });
  });

  it("rejects text that is not a URL", () => {
    expect(parseLink("not a url")).toEqual({ error: LINK_ERRORS.invalid });
  });

  it("accepts a mailto link with a plausible address and uses the address as title", () => {
    expect(parseLink("mailto:dusan@example.com").link).toEqual({
      url: "mailto:dusan@example.com",
      title: "dusan@example.com",
      type: "other",
    });
    expect(parseLink("mailto:a@b.co?subject=Hi").link.title).toBe("a@b.co");
  });

  it("rejects a mailto link with a broken or multiple addresses", () => {
    expect(parseLink("mailto:nobody")).toEqual({ error: LINK_ERRORS.mail });
    expect(parseLink("mailto:a@b.co,c@d.co")).toEqual({ error: LINK_ERRORS.mail });
  });
});

describe("isSafeHref and isMailto", () => {
  it("allows http, https and mailto only", () => {
    expect(isSafeHref("https://a.co")).toBe(true);
    expect(isSafeHref("mailto:a@b.co")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("not a url")).toBe(false);
  });

  it("detects mailto", () => {
    expect(isMailto("mailto:a@b.co")).toBe(true);
    expect(isMailto("https://a.co")).toBe(false);
    expect(isMailto("nope")).toBe(false);
  });
});

describe("hostOf, linkTypeFor, linkLabel", () => {
  it("returns the hostname or null", () => {
    expect(hostOf("https://sub.figma.com/x")).toBe("sub.figma.com");
    expect(hostOf("mailto:a@b.co")).toBeNull();
    expect(hostOf("nope")).toBeNull();
  });

  it("matches subdomains of known hosts", () => {
    expect(linkTypeFor("www.figma.com")).toBe("design");
    expect(linkTypeFor("docs.google.com")).toBe("docs");
    expect(linkTypeFor("my.netlify.app")).toBe("code");
    expect(linkTypeFor("notfigma.com")).toBe("other");
    expect(linkTypeFor("")).toBe("other");
  });

  it("falls back from title to host to url", () => {
    expect(linkLabel({ title: "Brief", url: "https://a.co" })).toBe("Brief");
    expect(linkLabel({ title: "", url: "https://a.co/x" })).toBe("a.co");
    expect(linkLabel({ title: "", url: "mailto:a@b.co" })).toBe("mailto:a@b.co");
  });
});

describe("groupLinks", () => {
  const links = [
    { id: "1", title: "Repo", url: "https://github.com/a", type: "code" },
    { id: "2", title: "Mock", url: "https://figma.com/x", type: "link" },
    { id: "3", title: "Blog", url: "https://example.com", type: "other" },
    { id: "4", title: "Spec", url: "https://notion.so/y" },
  ];

  it("orders groups design, code, docs, other and drops empty ones", () => {
    const groups = groupLinks(links);
    expect(groups.map((g) => g.id)).toEqual(["design", "code", "docs", "other"]);
    expect(groups.map((g) => g.items.map((l) => l.id))).toEqual([["2"], ["1"], ["4"], ["3"]]);
  });

  it("re-derives the group for legacy 'link' types and missing types", () => {
    const groups = groupLinks([links[1], links[3]]);
    expect(groups.map((g) => g.id)).toEqual(["design", "docs"]);
  });

  it("returns an empty list for no links", () => {
    expect(groupLinks([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const copy = JSON.parse(JSON.stringify(links));
    groupLinks(links);
    expect(links).toEqual(copy);
  });
});
