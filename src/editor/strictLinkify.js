import { Extension } from '@tiptap/core';
import { installOnce } from './markdownIt.js';

// markdown-it's linkify also "fuzzy" links anything shaped like a domain or an email: `odoo.com`,
// `CLAUDE.md` (.md is a country code), `name@mail.si`. On save that turned the user's plain text into
// `[odoo.com](http://odoo.com)`. Obsidian leaves such text alone, so only explicit schemes link.
export const strictLinkify = (md) => {
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false, fuzzyIP: false });
  // markdown-it shows an autolink's text percent-decoded (`%7C` becomes `|`); saving that would
  // edit the URL the user wrote, so the text stays exactly as typed.
  md.normalizeLinkText = (text) => text;
};

export const StrictLinkify = Extension.create({
  name: 'strictLinkify',
  addStorage() {
    return { markdown: { parse: { setup: (md) => installOnce(md, 'strict-linkify', strictLinkify) } } };
  },
});
