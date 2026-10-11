// @vitest-environment jsdom
/* global process */
// Real-vault formatting fidelity (see docs/obsidian-parity.md, "Real vault fidelity").
// READ-ONLY on the vault. A no-op unless VAULT_FIDELITY_DIR is set:
//   VAULT_FIDELITY_DIR=/path/to/vault VAULT_FIDELITY_OUT=/some/dir/f.json \
//     npx vitest run --pool=threads scripts/vault-fidelity.test.js
// Four measurements per note, all on the body markdownToNote hands the editor:
//   untouched  open, save: how many notes come back byte for byte
//   plain      the same with the original text switched off: how the editor itself formats
//   editTop    type one character at the end of a middle top-level paragraph or heading
//   editList   type one character at the end of a middle list item
// For the two edits, "collateral" is every changed line except the one that was typed in.
// Printed snippets show markdown shape only (words become "w"); the JSON file stays out of the repo.
import { it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Editor } from '@tiptap/core';
import { createExtensions } from '../src/editor/extensions.js';
import { markdownToNote } from '../src/lib/noteFile.js';
import { classifyDiff, CLASSES } from './fidelityDiff.js';

const TOP = Number(process.env.VAULT_FIDELITY_TOP || 20);
const PROBE = '§';

const listNotes = (root) => {
  const found = [];
  const walk = (dir, depth) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (depth === 0 && entry.name === 'Opus') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name.endsWith('.md')) found.push(full);
    }
  };
  walk(root, 0);
  return found;
};

const open = (markdown, plain = false) => {
  const editor = new Editor({ element: document.createElement('div'), content: markdown, extensions: createExtensions() });
  editor.storage.sourceFormat.plain = plain;
  return editor;
};

const save = (markdown, plain = false) => {
  const editor = open(markdown, plain);
  try {
    return editor.storage.markdown.getMarkdown();
  } finally {
    editor.destroy();
  }
};

// Position at the end of the middle text block that qualifies, or null
const probeSpot = (editor, inList) => {
  const spots = [];
  editor.state.doc.descendants((node, pos, parent) => {
    if (!node.isTextblock || node.content.size === 0) return;
    const isInList = parent && (parent.type.name === 'listItem' || parent.type.name === 'taskItem');
    const isTop = parent === editor.state.doc && node.type.name !== 'codeBlock';
    if (inList ? isInList : isTop) spots.push(pos + node.nodeSize - 1);
  });
  return spots.length ? spots[Math.floor(spots.length / 2)] : null;
};

const edit = (markdown, inList) => {
  const editor = open(markdown);
  try {
    const at = probeSpot(editor, inList);
    if (at === null) return null;
    editor.view.dispatch(editor.state.tr.insertText(PROBE, at));
    return editor.storage.markdown.getMarkdown();
  } finally {
    editor.destroy();
  }
};

// Words collapse to "w" so the printed snippets show the markdown shape, not the private text.
const show = (lines) => JSON.stringify(lines.slice(0, 3).map((l) => l.replace(/[\p{L}\p{N}]+/gu, 'w').replace(/(w[^\w\n]{0,3}){3,}/g, 'w...'))).slice(0, 140);

const makeStats = () => ({
  measured: 0,
  identical: 0,
  classTotals: Object.fromEntries(CLASSES.map((c) => [c, 0])),
  classNotes: Object.fromEntries(CLASSES.map((c) => [c, 0])),
  snippets: new Map(),
  collateralLines: 0,
});

const lineCount = (h) => Math.max(h.old.length, h.new.length);

const record = (stats, diff, withProbe = false) => {
  stats.measured += 1;
  // The typed line is one changed line; anything else the save touched is collateral
  const changed = diff.hunks.reduce((n, h) => n + lineCount(h), 0);
  const collateral = withProbe ? Math.max(0, changed - 1) : changed;
  if (collateral === 0) stats.identical += 1;
  stats.collateralLines += collateral;
  const seen = new Set();
  diff.hunks.forEach((h) => {
    const isTyped = withProbe && h.old.length === 1 && h.new.length === 1 && h.new[0].includes(PROBE);
    if (isTyped) return;
    stats.classTotals[h.cls] += 1;
    seen.add(h.cls);
    const key = `${h.cls}\u0000${show(h.old)}\u0000${show(h.new)}\u0000${(h.around || []).join(' | ')}`;
    stats.snippets.set(key, (stats.snippets.get(key) || 0) + 1);
  });
  seen.forEach((cls) => { stats.classNotes[cls] += 1; });
};

const finish = (stats) => {
  const top = [...stats.snippets.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)
    .map(([key, count]) => { const [cls, before, after, around] = key.split('\u0000'); return { count, cls, before, after, around }; });
  return {
    measured: stats.measured,
    clean: stats.identical,
    cleanPct: Number(((stats.identical / Math.max(1, stats.measured)) * 100).toFixed(1)),
    collateralLines: stats.collateralLines,
    classTotals: stats.classTotals,
    classNotes: stats.classNotes,
    top,
  };
};

it('vault fidelity (never fails; set VAULT_FIDELITY_DIR to run)', () => {
  const root = process.env.VAULT_FIDELITY_DIR;
  if (!root) return;
  const files = listNotes(root);
  const modes = { untouched: makeStats(), plain: makeStats(), editTop: makeStats(), editList: makeStats() };
  const unstable = [];
  const errors = [];

  files.forEach((file) => {
    if (process.env.VAULT_FIDELITY_PROGRESS) fs.appendFileSync(process.env.VAULT_FIDELITY_PROGRESS, `${Date.now()} ${fs.statSync(file).size}\n`);
    const body = markdownToNote(fs.readFileSync(file, 'utf8')).content;
    try {
      const once = save(body);
      record(modes.untouched, classifyDiff(body, once));
      // Idempotence: saving the saved text again must not move it
      const twice = save(once);
      if (twice !== once) unstable.push({ file: path.relative(root, file), ...classifyDiff(once, twice).classes });
      record(modes.plain, classifyDiff(body, save(body, true)));
      const top = edit(body, false);
      if (top !== null) record(modes.editTop, classifyDiff(body, top), true);
      const list = edit(body, true);
      if (list !== null) record(modes.editList, classifyDiff(body, list), true);
    } catch (error) {
      errors.push({ file: path.relative(root, file), message: String(error.message).slice(0, 200) });
    }
  });

  const result = {
    notes: files.length,
    idempotenceViolations: unstable.length,
    errors: errors.length,
    ...Object.fromEntries(Object.entries(modes).map(([name, stats]) => [name, finish(stats)])),
  };
  const compact = { ...result };
  Object.keys(modes).forEach((name) => { compact[name] = { ...result[name], top: undefined }; });
  console.log(JSON.stringify(compact));
  if (process.env.VAULT_FIDELITY_OUT) fs.writeFileSync(process.env.VAULT_FIDELITY_OUT, JSON.stringify({ ...result, unstable, errors }, null, 1));
}, 900000);
