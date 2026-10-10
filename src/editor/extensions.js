import StarterKit from '@tiptap/starter-kit';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { AutoMarkdownShortcuts } from './autoMarkdownShortcuts.js';
import { MarkdownHighlight } from './markdownHighlight.js';
import { PlainText } from './plainText.js';
import { SoftBreak } from './softBreak.js';
import { WikiLink } from './wikiLink.js';
import { Image } from './image.js';
import { HtmlInline, HtmlBlock } from './htmlRaw.js';
import { CommentInline, CommentBlock } from './obsidianComment.js';
import { FootnoteRef, InlineFootnote, FootnoteDefinition } from './footnotes.js';
import { MathInline, MathBlock } from './math.js';

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

/**
 * The one extension list. EditorRich, the load-time safety check (roundTrip.js) and the
 * parity harness (scripts/obsidian-parity.test.js) all build from this, so what is
 * measured is what runs. New syntax gets its own file in this folder and one line here.
 */
export const createExtensions = ({ onOpenLink } = {}) => [
  StarterKit.configure({
    heading: { levels: HEADING_LEVELS },
    horizontalRule: false,
    text: false,
  }),
  PlainText,
  SoftBreak,
  TaskList,
  TaskItem.configure({ nested: true }),
  MarkdownHighlight,
  Link.configure({ autolink: true, openOnClick: false, linkOnPaste: true }),
  HorizontalRule,
  WikiLink.configure({ onOpenLink }),
  Image,
  HtmlInline,
  HtmlBlock,
  CommentInline,
  CommentBlock,
  FootnoteRef,
  InlineFootnote,
  FootnoteDefinition,
  MathInline,
  MathBlock,
  Markdown.configure({
    // html: markdown-it must see tags to hand them to the raw HTML atoms (htmlRaw.js)
    html: true,
    tightLists: true,
    bulletListMarker: '-',
    linkify: true,
    breaks: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
  AutoMarkdownShortcuts,
];
