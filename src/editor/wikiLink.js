import { InputRule, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { installOnce, matchAt } from './markdownIt.js';
import { writeRaw } from './rawNode.js';
import { mountEmbed } from './embeds.js';

const DATA_ATTR = 'data-maia-wikilink';
// No brackets or newlines inside, same as Obsidian. `!` makes it an embed.
const WIKILINK = /!?\[\[[^[\]\n]+\]\]/y;
const TYPED_WIKILINK = /!?\[\[[^[\]\n]+\]\]$/;
const FILE_EXTENSION = /\.[A-Za-z0-9]{1,5}$/;

/** Splits `[[Note#Heading|alias]]` / `![[file.png|300]]` into its parts. */
export const parseWikiLink = (raw) => {
  const isEmbed = raw.startsWith('!');
  const inner = raw.slice(isEmbed ? 3 : 2, -2);
  const pipe = inner.indexOf('|');
  const ref = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
  const alias = pipe === -1 ? '' : inner.slice(pipe + 1).trim();
  const hash = ref.indexOf('#');
  return {
    isEmbed,
    target: (hash === -1 ? ref : ref.slice(0, hash)).trim(),
    subpath: hash === -1 ? '' : ref.slice(hash + 1).trim(),
    alias,
  };
};

/** What the chip shows: the alias if there is one, else target and heading. */
export const wikiLinkLabel = (raw) => {
  const { isEmbed, target, subpath, alias } = parseWikiLink(raw);
  if (isEmbed) return target || raw;
  if (alias) return alias;
  return [target, subpath].filter(Boolean).join(' > ') || raw;
};

export const wikiLinkPlugin = (md) => {
  md.inline.ruler.before('link', 'maia_wikilink', (state, silent) => {
    const first = state.src.charCodeAt(state.pos);
    if (first !== 0x5b && first !== 0x21) return false; // [ or !
    const match = matchAt(WIKILINK, state.src, state.pos);
    if (!match) return false;
    if (!silent) state.push('maia_wikilink', '', 0).meta = { raw: match[0] };
    state.pos += match[0].length;
    return true;
  });
  md.renderer.rules.maia_wikilink = (tokens, idx) =>
    `<span ${DATA_ATTR}="${md.utils.escapeHtml(tokens[idx].meta.raw)}"></span>`;
};

/**
 * `[[Note]]`, `[[Note|alias]]`, `[[Note#Heading]]` and `![[embed]]` as one atom that keeps the
 * original text, so saving writes back exactly what Obsidian wrote. Clicking a link opens the note.
 */
export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    // embeds: the vault-aware provider from embedProvider.js, null on the web
    return { onOpenLink: undefined, embeds: null };
  },

  addAttributes() {
    return { raw: { default: '', rendered: false, parseHTML: (el) => el.getAttribute(DATA_ATTR) ?? '' } };
  },

  parseHTML() {
    return [{ tag: `span[${DATA_ATTR}]` }];
  },

  renderHTML({ node }) {
    const { raw } = node.attrs;
    const { isEmbed } = parseWikiLink(raw);
    return ['span', {
      [DATA_ATTR]: raw,
      class: isEmbed ? 'maia-embed' : 'maia-wikilink',
      title: raw,
    }, wikiLinkLabel(raw)];
  },

  renderText: ({ node }) => node.attrs.raw,

  addNodeView() {
    const { embeds } = this.options;
    return ({ node: initial }) => {
      const dom = document.createElement('span');
      let mounted = null;
      const paint = (raw) => {
        mounted?.destroy();
        mounted = null;
        const ref = { raw, ...parseWikiLink(raw) };
        dom.setAttribute(DATA_ATTR, raw);
        dom.title = raw;
        dom.textContent = wikiLinkLabel(raw);
        const resolves = ref.isEmbed && embeds?.isActive();
        // the host stays a plain wrapper once the chip is replaced by an image, file card or note
        dom.className = resolves ? 'maia-embed-host' : ref.isEmbed ? 'maia-embed' : 'maia-wikilink';
        if (resolves) {
          const pending = document.createElement('span');
          pending.className = 'maia-embed';
          pending.textContent = wikiLinkLabel(raw);
          dom.replaceChildren(pending);
          mounted = mountEmbed(dom, ref, embeds);
        }
      };
      paint(initial.attrs.raw);
      let current = initial.attrs.raw;
      return {
        dom,
        update: (node) => {
          if (node.type !== initial.type) return false;
          if (node.attrs.raw !== current) {
            current = node.attrs.raw;
            paint(current);
          }
          return true;
        },
        // a note card is its own little document: clicks inside it are not editor clicks
        stopEvent: (event) => Boolean(event.target?.closest?.('.maia-embed-note')),
        ignoreMutation: () => true,
        destroy: () => mounted?.destroy(),
      };
    };
  },

  addInputRules() {
    return [new InputRule({
      find: TYPED_WIKILINK,
      handler: ({ state, range, match }) => {
        state.tr.replaceWith(range.from, range.to, this.type.create({ raw: match[0] }));
      },
    })];
  },

  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('maiaWikiLinkClick'),
      props: {
        handleClickOn: (view, pos, node) => {
          if (node.type.name !== 'wikiLink') return false;
          const { isEmbed, target } = parseWikiLink(node.attrs.raw);
          // Embedded files (images, pdfs) have nothing to open yet; embedded notes do.
          if (!target || (isEmbed && FILE_EXTENSION.test(target))) return false;
          this.options.onOpenLink?.(target);
          return true;
        },
      },
    })];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          writeRaw(state, node.attrs.raw);
        },
        parse: { setup: (md) => installOnce(md, 'wikiLink', wikiLinkPlugin) },
      },
    };
  },
});
