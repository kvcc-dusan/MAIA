// Pure logic behind `[[` and `![[` autocomplete: reading what was typed, matching, ranking and
// building the text that gets inserted. No editor, no DOM, no disk.
import { fileKind } from '../lib/vaultFiles.js';

export const MAX_ITEMS = 50;
const EMBEDDABLE_FILE_KINDS = new Set(['image', 'pdf', 'audio', 'video']);
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BLOCK_ID = /\s\^([A-Za-z0-9-]+)\s*$/;
const OPENER = /^(!?)\[\[/;
const WORD_BOUNDARY = /[\s\-_/.]/;
const MIN_FUZZY_LENGTH = 2;
const BLOCK_PREVIEW_LENGTH = 80;
const SCORE_ALL = 5;

const lower = (s) => String(s ?? '').trim().toLowerCase();
const stripMd = (s) => s.replace(/\.md$/i, '');
const segments = (path) => path.split('/').length;
const notePath = (note) => (note.folder ? `${note.folder}/${note.title}` : note.title);
const timestamp = (note) => Date.parse(note.updatedAt || note.createdAt || '') || 0;

/**
 * Reads the text between the opening brackets and the caret. `text` is the whole match, opener
 * included, so a note called "!x" cannot be mistaken for an embed.
 */
export const parseQuery = (text) => {
  const opener = OPENER.exec(text);
  const isEmbed = opener?.[1] === '!';
  const rest = opener ? text.slice(opener[0].length) : text;
  // after `|` the alias is free text, nothing to suggest
  if (rest.includes('|')) return { isEmbed, stage: 'alias', noteText: '', subText: '' };
  const hash = rest.indexOf('#');
  if (hash === -1) return { isEmbed, stage: 'note', noteText: rest, subText: '' };
  const noteText = rest.slice(0, hash);
  const sub = rest.slice(hash + 1);
  if (sub.startsWith('^')) return { isEmbed, stage: 'block', noteText, subText: sub.slice(1) };
  // `Note#Parent#Child` points at the last part, same as noteSection.js
  return { isEmbed, stage: 'heading', noteText, subText: sub.slice(sub.lastIndexOf('#') + 1) };
};

export const emptyLabel = ({ stage, isEmbed }) => {
  if (stage === 'heading') return 'No matching heading';
  if (stage === 'block') return 'No matching block';
  return isEmbed ? 'No matching note or file' : 'No matching note';
};

/** 0 exact, 1 prefix, 2 word prefix, 3 substring, 4 loose letters in order, null no match. */
export const scoreMatch = (needle, haystack) => {
  const n = lower(needle);
  if (!n) return SCORE_ALL;
  const h = lower(haystack);
  if (h === n) return 0;
  if (h.startsWith(n)) return 1;
  const at = h.indexOf(n);
  if (at > 0) return WORD_BOUNDARY.test(h[at - 1]) ? 2 : 3;
  if (n.length < MIN_FUZZY_LENGTH) return null;
  let matched = 0;
  for (const ch of h) if (ch === n[matched]) matched += 1;
  return matched === n.length ? 4 : null;
};

const unquote = (s) => s.trim().replace(/^["']|["']$/g, '').trim();

/** `aliases` from a note: an array/string field, or the raw YAML kept in frontmatterExtra. */
export const noteAliases = (note) => {
  const direct = note.aliases ?? note.alias;
  let list = [];
  if (Array.isArray(direct)) list = direct;
  else if (typeof direct === 'string') list = [direct];
  else {
    const raw = note.frontmatterExtra?.aliases ?? note.frontmatterExtra?.alias;
    if (typeof raw === 'string') {
      const body = raw.replace(/^\s*alias(?:es)?\s*:/, '').trim();
      if (body.startsWith('[')) list = body.replace(/^\[|\]$/g, '').split(',');
      else if (body && !body.startsWith('-')) list = [body];
      else list = body.split('\n').map((line) => line.replace(/^\s*-\s*/, ''));
    }
  }
  return list.map((a) => unquote(String(a))).filter(Boolean);
};

/**
 * Shortest form that still finds this path: the name alone, else more folders from the right.
 * A name that is also used deeper in the vault still resolves to the shallowest one (like
 * findNote in embedProvider.js), so that one can stay short.
 */
export const shortestTarget = (path, allPaths) => {
  const parts = path.split('/');
  const lowerAll = allPaths.map((p) => p.toLowerCase());
  for (let take = 1; take < parts.length; take += 1) {
    const suffix = parts.slice(-take).join('/').toLowerCase();
    const hits = lowerAll.filter((p) => p === suffix || p.endsWith(`/${suffix}`));
    const shallowest = Math.min(...hits.map(segments));
    const best = hits.filter((p) => segments(p) === shallowest);
    if (best.length === 1 && best[0] === path.toLowerCase()) return parts.slice(-take).join('/');
  }
  return path;
};

/** Same lookup rule as embedProvider.findNote, kept here so this module stays pure. */
export const resolveNote = (notes, text) => {
  const wanted = lower(stripMd(String(text ?? '')));
  if (!wanted) return null;
  const matches = notes.filter((n) => {
    const full = lower(notePath(n));
    return lower(n.title) === wanted || full === wanted || full.endsWith(`/${wanted}`);
  });
  matches.sort((a, b) => segments(notePath(a)) - segments(notePath(b)));
  return matches[0] ?? null;
};

/** Obsidian drops these from heading links because they carry meaning inside a link. */
export const cleanHeading = (text) =>
  text.replace(/\[\[|\]\]/g, ' ').replace(/[#|^:[\]]/g, ' ').replace(/\s+/g, ' ').trim();

export const extractHeadings = (content = '') => {
  let inFence = false;
  const out = [];
  for (const line of content.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = HEADING.exec(line);
    const text = match ? cleanHeading(match[2]) : '';
    if (text) out.push({ level: match[1].length, text });
  }
  return out;
};

export const extractBlocks = (content = '') => {
  let inFence = false;
  const out = [];
  for (const line of content.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = BLOCK_ID.exec(line);
    if (!match) continue;
    const text = line.replace(BLOCK_ID, '').replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?/, '').trim();
    out.push({ id: match[1], text: text.slice(0, BLOCK_PREVIEW_LENGTH) });
  }
  return out;
};

const linkText = ({ isEmbed, target, sub = '', alias = '' }) =>
  `${isEmbed ? '!' : ''}[[${target}${sub ? `#${sub}` : ''}${alias ? `|${alias}` : ''}]]`;

const bestNoteScore = (note, needle, withPath) => {
  const hits = [{ score: scoreMatch(needle, note.title), alias: '' }];
  if (withPath) hits.push({ score: scoreMatch(needle, notePath(note)), alias: '' });
  noteAliases(note).forEach((alias) => hits.push({ score: scoreMatch(needle, alias), alias }));
  const found = hits.filter((h) => h.score !== null);
  // a title hit wins ties over an alias hit, so no alias is inserted when none is needed
  return found.sort((a, b) => a.score - b.score || Number(Boolean(a.alias)) - Number(Boolean(b.alias)))[0] ?? null;
};

const noteCandidates = (notes, { noteText, isEmbed }) => {
  const needle = lower(noteText);
  const paths = notes.map(notePath);
  const titles = new Map();
  notes.forEach((n) => titles.set(lower(n.title), (titles.get(lower(n.title)) ?? 0) + 1));
  return notes.flatMap((note) => {
    if (!note.title) return [];
    const hit = bestNoteScore(note, needle, needle.includes('/'));
    if (!hit) return [];
    const target = shortestTarget(notePath(note), paths);
    const isDuplicate = titles.get(lower(note.title)) > 1;
    return [{
      score: hit.score,
      time: timestamp(note),
      item: {
        key: `note:${note.id ?? notePath(note)}`,
        kind: 'note',
        label: note.title,
        detail: hit.alias ? `Alias: ${hit.alias}` : note.folder || (isDuplicate ? 'Vault root' : ''),
        subdetail: hit.alias ? note.folder : '',
        raw: linkText({ isEmbed, target, alias: isEmbed ? '' : hit.alias }),
      },
    }];
  });
};

const fileCandidates = (files, { noteText }) => {
  const needle = lower(noteText);
  return files.flatMap((path) => {
    const kind = fileKind(path);
    if (!EMBEDDABLE_FILE_KINDS.has(kind)) return [];
    const name = path.slice(path.lastIndexOf('/') + 1);
    const score = [scoreMatch(needle, name), needle.includes('/') ? scoreMatch(needle, path) : null]
      .filter((s) => s !== null).sort((a, b) => a - b)[0];
    if (score === undefined) return [];
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    return [{
      score,
      time: 0,
      item: {
        key: `file:${path}`, kind: 'file', fileKind: kind, label: name, detail: dir, subdetail: '',
        raw: linkText({ isEmbed: true, target: shortestTarget(path, files) }),
      },
    }];
  });
};

const byRelevance = (a, b) => a.score - b.score || b.time - a.time || a.item.label.localeCompare(b.item.label);

const subItems = (parsed, { notes, currentContent }) => {
  const named = parsed.noteText.trim() !== '';
  const note = named ? resolveNote(notes, parsed.noteText) : null;
  if (named && !note) return [];
  const content = named ? note.content : currentContent;
  const target = note ? shortestTarget(notePath(note), notes.map(notePath)) : '';
  const isBlock = parsed.stage === 'block';
  const entries = isBlock
    ? extractBlocks(content).map((b) => ({ ...b, text: b.text || b.id, search: `${b.id} ${b.text}` }))
    : extractHeadings(content).map((h) => ({ ...h, search: h.text }));
  return entries
    .map((entry, order) => ({ entry, order, score: scoreMatch(parsed.subText, entry.search) }))
    .filter((c) => c.score !== null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, MAX_ITEMS)
    .map(({ entry, order }) => ({
      key: `${parsed.stage}:${order}`,
      kind: parsed.stage,
      label: entry.text,
      detail: isBlock ? `^${entry.id}` : `H${entry.level}`,
      subdetail: '',
      raw: linkText({ isEmbed: parsed.isEmbed, target, sub: isBlock ? `^${entry.id}` : entry.text }),
    }));
};

/**
 * What the popup lists for a typed query. `notes` are the vault notes, `files` the vault file
 * paths (empty on the web), `currentContent` the open note's markdown for `[[#`.
 */
export const buildItems = (query, { notes = [], files = [], currentContent = '' } = {}) => {
  const parsed = parseQuery(query);
  if (parsed.stage === 'alias') return [];
  if (parsed.stage !== 'note') return subItems(parsed, { notes, currentContent });
  const candidates = [
    ...noteCandidates(notes, parsed),
    ...(parsed.isEmbed ? fileCandidates(files, parsed) : []),
  ];
  return candidates.sort(byRelevance).slice(0, MAX_ITEMS).map((c) => c.item);
};
