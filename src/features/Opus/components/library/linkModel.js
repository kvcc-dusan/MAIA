// Project links: URL validation and host-based grouping. Pure, no React.
//
// Stored shape is { id, title, url, type }. `type` groups the list; legacy
// links were all written as 'link', so the group is re-derived from the host
// whenever the stored type is missing or generic.

export const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

export const LINK_GROUPS = [
  { id: "design", label: "Design", hosts: ["figma.com", "sketch.com", "framer.com", "dribbble.com", "penpot.app"] },
  { id: "code", label: "Code", hosts: ["github.com", "gitlab.com", "bitbucket.org", "vercel.com", "netlify.app", "netlify.com"] },
  { id: "docs", label: "Docs", hosts: ["notion.so", "docs.google.com", "linear.app", "confluence.com", "slite.com"] },
];
export const OTHER_GROUP = { id: "other", label: "Other" };

export const LINK_ERRORS = {
  empty: "Enter a link.",
  invalid: "That doesn't look like a web address. Try something like figma.com/file/abc.",
  unsupported: "Only http, https and mailto links are supported. Remove the scheme or use one of those.",
  mail: "That email address looks incomplete. Use the form name@example.com.",
};

// "//" marks a real scheme; "localhost:3000" or "figma.com:443" are hosts with a port.
const SCHEME_WITH_SLASHES = /^[a-z][a-z0-9+.-]*:\/\//i;
// Schemes that carry no "//". Listing them keeps "javascript:alert(1)" from being read as a host.
const SCHEME_WITHOUT_SLASHES = /^(mailto|javascript|data|vbscript|file|tel|sms|blob|about):/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const hostOf = (url) => {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
};

export const linkTypeFor = (hostname) => {
  const host = String(hostname ?? "").replace(/^www\./, "");
  const hit = LINK_GROUPS.find((g) => g.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  return hit ? hit.id : OTHER_GROUP.id;
};

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseMailto = (url, input) => {
  const address = safeDecode(url.pathname);
  if (!EMAIL.test(address)) return { error: LINK_ERRORS.mail };
  return { link: { url: input, title: address, type: OTHER_GROUP.id } };
};

/**
 * Validates and normalizes what the user typed.
 * Returns `{ link: { url, title, type } }` or `{ error }` with a message that
 * says how to fix it. Bare domains get https://; only http, https and mailto pass.
 */
export const parseLink = (raw) => {
  const input = String(raw ?? "").trim();
  if (!input) return { error: LINK_ERRORS.empty };

  const hasScheme = SCHEME_WITH_SLASHES.test(input) || SCHEME_WITHOUT_SLASHES.test(input);
  const candidate = hasScheme ? input : `https://${input}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return { error: LINK_ERRORS.invalid };
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return { error: LINK_ERRORS.unsupported };
  if (url.protocol === "mailto:") return parseMailto(url, candidate);
  if (!url.hostname.includes(".")) return { error: LINK_ERRORS.invalid };

  return {
    link: {
      url: candidate,
      title: url.hostname.replace(/^www\./, ""),
      type: linkTypeFor(url.hostname),
    },
  };
};

/** Stored data may predate validation, so rows re-check before rendering an anchor. */
export const isSafeHref = (url) => {
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

export const isMailto = (url) => {
  try {
    return new URL(url).protocol === "mailto:";
  } catch {
    return false;
  }
};

export const linkLabel = (link) => link.title || hostOf(link.url) || link.url;

const groupIdFor = (link) =>
  link.type && link.type !== "link" ? link.type : linkTypeFor(hostOf(link.url) || "");

/** Non-empty groups in a fixed order: design, code, docs, other. */
export const groupLinks = (links) =>
  [...LINK_GROUPS, OTHER_GROUP]
    .map((group) => ({ id: group.id, label: group.label, items: links.filter((l) => groupIdFor(l) === group.id) }))
    .filter((group) => group.items.length > 0);
