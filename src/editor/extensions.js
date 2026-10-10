import StarterKit from '@tiptap/starter-kit';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Link from '@tiptap/extension-link';
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
import { MermaidDiagrams } from './mermaid.js';

import { TaskListWithStatus, TaskItemWithStatus } from './taskStatus.js';
import { Callout, CalloutTitle } from './callout.js';
import { RefDefinition, RefLink } from './refLinks.js';
import { HtmlEntity } from './entities.js';
import { InlineShortcuts } from './inlineShortcuts.js';
import { MarkdownTable, MarkdownTableRow, MarkdownTableHeader, MarkdownTableCell } from './table.js';

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

/**
 * The one extension list. EditorRich, the load-time safety check (roundTrip.js) and the
 * parity harness (scripts/obsidian-parity.test.js) all build from this, so what is
 * measured is what runs. New syntax gets its own file in this folder and one line here.
 */
export const createExtensions = ({ onOpenLink, embeds = null } = {}) => [
  StarterKit.configure({
    heading: { levels: HEADING_LEVELS },
    horizontalRule: false,
    text: false,
  }),
  PlainText,
  SoftBreak,
  TaskListWithStatus,
  TaskItemWithStatus.configure({ nested: true }),
  MarkdownHighlight,
  Link.configure({ autolink: true, openOnClick: false, linkOnPaste: true }),
  HorizontalRule,
  WikiLink.configure({ onOpenLink, embeds }),
  Image.configure({ embeds }),
  HtmlInline,
  HtmlBlock,
  CommentInline,
  CommentBlock,
  FootnoteRef,
  InlineFootnote,
  FootnoteDefinition,
  MathInline,
  MathBlock,
  MermaidDiagrams,
  // stage 2: callouts and tables
  CalloutTitle,
  Callout,
  MarkdownTable,
  MarkdownTableRow,
  MarkdownTableHeader,
  MarkdownTableCell,
  RefDefinition,
  RefLink,
  HtmlEntity,
  InlineShortcuts,
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
