// src/lib/markdown.js
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import mark from "markdown-it-mark";
import taskLists from "markdown-it-task-lists";
import DOMPurify from "dompurify";

// Callouts + wiki-links + image size helpers
function preprocess(src) {
  // strip Obsidian comments
  const withoutComments = (src || "").replace(/%%[\s\S]*?%%/g, "");

  // [[Wiki Links]]  -> <a data-internal-link="...">...</a>
  const wikilinkRE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const withWiki = withoutComments.replace(wikilinkRE, (_m, target, alias) => {
    const text = (alias || target).trim();
    const title = target.trim().replace(/"/g, "&quot;");
    const safe = text.replace(/[&<>"]/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[s]));
    return `<a href="#" data-internal-link="${title}">${safe}</a>`;
  });

  // ![alt](url|640x320) -> ![alt](url){width=640 height=320}
  const withSize = withWiki.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\|(\d+)x(\d+)\)/g,
    (_m, alt, url, w, h) => `![${alt}](${url}){width=${w} height=${h}}`
  );

  return withSize;
}

export function makeMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: false })
    .use(footnote)
    .use(mark)                 // ==highlight==
    .use(taskLists, { enabled: true, label: true });

  // convert size braces into attrs on <img>
  function postprocess(html) {
    return html.replace(
      /<img([^>]*?)>\{([^}]+)\}/g,
      (m, attrs, kvs) => {
        const cleaned = kvs
          .trim()
          .replace(/(\w+)=/g, '$1="')
          .replace(/(\d+)(?=\s|$)/g, '$1"');
        return `<img${attrs} ${cleaned}>`;
      }
    ).replace(
      // Callouts: > [!info] ...
      /<blockquote>\s*<p>\s*\[!(\w+)\]\s*/g,
      (_m, kind) => `<blockquote class="callout callout-${kind.toLowerCase()}"><p>`
    );
  }

  return {
    render(src) {
      const pre = preprocess(src);
      const rawHtml = md.render(pre);
      const sanitized = DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ["data-internal-link", "target", "id"], // Allow wikilinks, external links, and footnote IDs
        ADD_TAGS: ["input"], // Allow checkbox inputs for task lists
      });
      return postprocess(sanitized);
    }
  };
}
