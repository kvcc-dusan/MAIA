// Classifies how a markdown body changed after an editor round trip. Pure, no IO.
// Used by scripts/vault-fidelity.test.js; tests in scripts/fidelityDiff.test.js.

export const CLASSES = [
  'line endings', 'EOF newline', 'bullet marker', 'ordered marker', 'rule', 'heading style',
  'emphasis marker', 'blank-line count', 'trailing whitespace', 'escapes', 'table formatting',
  'link/URL form', 'fence style', 'indentation', 'other',
];

const MAX_DP_CELLS = 4_000_000;

/** Changed regions between two line arrays: [{ old: [...], new: [...] }]. */
export const diffHunks = (a, b) => {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const x = a.slice(start, endA);
  const y = b.slice(start, endB);
  if (x.length === 0 && y.length === 0) return [];
  if (x.length * y.length > MAX_DP_CELLS) return [{ old: x, new: y, at: start }];
  // LCS table over the changed middle only
  const w = y.length + 1;
  const t = new Uint32Array((x.length + 1) * w);
  for (let i = x.length - 1; i >= 0; i -= 1) {
    for (let j = y.length - 1; j >= 0; j -= 1) {
      t[i * w + j] = x[i] === y[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const hunks = [];
  let cur = null;
  const flush = () => { if (cur) hunks.push(cur); cur = null; };
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { flush(); i += 1; j += 1; continue; }
    cur = cur || { old: [], new: [], at: start + i };
    if (j >= y.length || (i < x.length && t[(i + 1) * w + j] >= t[i * w + j + 1])) { cur.old.push(x[i]); i += 1; } else { cur.new.push(y[j]); j += 1; }
  }
  flush();
  return hunks;
};

const nonBlank = (lines) => lines.filter((l) => l.trim() !== '');
const RULE = /^\s*([*_-])(?:\s*\1){2,}\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const text = (lines) => lines.join('\n');
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const noEsc = (s) => s.replace(/\\(.)/g, '$1');
const noEmph = (s) => s.replace(/[*_]/g, '');
const stripListMarker = (s) => s.replace(/^(\s*)(?:[-*+]|\d+[.)])\s+/gm, '$1');

/** The markdown skeleton of a line (marker only), so context can be shown without note text. */
export const shape = (line) => {
  if (line === undefined) return '^';
  if (line.trim() === '') return '_';
  const lead = line.match(/^\s*/)[0].replace(/\t/g, 'T');
  const marker = line.trim().match(/^(?:- \[.\]|[-*+]|\d+[.)]|#{1,6}|>+|\||```|~~~|---+|\*\*\*+|\||<)/);
  return `${lead.length ? `${lead.length}sp ` : ''}${marker ? marker[0] : 'T'}`;
};

/** One hunk to one class. Order matters: cheapest, most specific tests first. */
export const classifyHunk = ({ old: o, new: n }) => {
  const ot = text(o);
  const nt = text(n);
  if (nonBlank(o).join('\n') === nonBlank(n).join('\n')) return 'blank-line count';
  if (o.map((l) => l.trimEnd()).join('\n') === nt || ot.replace(/[ \t]+$/gm, '') === nt.replace(/[ \t]+$/gm, '')) return 'trailing whitespace';
  if (o.some((l) => /^\s*\|/.test(l) || l.includes(' | ')) || n.some((l) => /^\s*\|/.test(l))) return 'table formatting';
  if (o.some((l) => FENCE.test(l)) || n.some((l) => FENCE.test(l))) {
    if (squash(noEsc(ot).replace(/[~`]/g, '')) === squash(noEsc(nt).replace(/[~`]/g, ''))) return 'fence style';
  }
  if (o.some((l) => RULE.test(l)) && n.some((l) => RULE.test(l)) && o.length === n.length) return 'rule';
  if (o.some((l) => RULE.test(l)) && n.length && n.every((l) => l === '---' || l === '')) return 'rule';
  if (/^\s*[*+]\s/m.test(ot) && stripListMarker(ot) === stripListMarker(nt) && /^\s*-\s/m.test(nt)) return 'bullet marker';
  if (/^\s*\d+\)\s/m.test(ot) && stripListMarker(ot).trim() === stripListMarker(nt).trim()) return 'ordered marker';
  if (/^\s*\d+[.)]\s/m.test(ot) && /^\s*\d+[.)]\s/m.test(nt) && stripListMarker(ot) === stripListMarker(nt)) return 'ordered marker';
  if (/^#{1,6}\s/m.test(ot.replace(/\s#+\s*$/gm, '')) || /^(=+|-+)\s*$/m.test(ot) || /^#{1,6}\s/m.test(nt)) {
    const head = (s) => squash(s.replace(/^\s*#{1,6}\s*/gm, '').replace(/\s#+\s*$/gm, '').replace(/^(=+|-+)\s*$/gm, ''));
    if (head(ot) === head(nt)) return 'heading style';
  }
  if (noEmph(ot) === noEmph(nt)) return 'emphasis marker';
  if (noEmph(noEsc(ot)) === noEmph(noEsc(nt)) || noEsc(ot) === noEsc(nt)) return 'escapes';
  if (/\]\(|https?:|<[^>\s]+>|%20|\]\[/.test(ot + nt)) return 'link/URL form';
  if (squash(ot) === squash(nt) && o.some((l, i) => (l.match(/^\s*/)[0] !== (n[i] ?? '').match(/^\s*/)[0]))) return 'indentation';
  if (stripListMarker(ot).replace(/^\s+/gm, '') === stripListMarker(nt).replace(/^\s+/gm, '')) return 'indentation';
  return 'other';
};

/**
 * Every difference between the original body and the round-tripped one, as classes.
 * Returns { identical, classes: { name: count }, hunks: [{ cls, old, new }] }.
 */
export const classifyDiff = (original, output) => {
  if (original === output) return { identical: true, classes: {}, hunks: [] };
  const hunks = [];
  let a = original;
  let b = output;
  if (a.includes('\r\n')) {
    hunks.push({ cls: 'line endings', old: ['\\r\\n'], new: ['\\n'] });
    a = a.replace(/\r\n/g, '\n');
  }
  if (a !== b && a.endsWith('\n') !== b.endsWith('\n')) {
    hunks.push({ cls: 'EOF newline', old: [a.endsWith('\n') ? '...\\n' : '...'], new: [b.endsWith('\n') ? '...\\n' : '...'] });
    a = a.replace(/\n+$/, '');
    b = b.replace(/\n+$/, '');
  }
  if (a !== b) {
    const lines = a.split('\n');
    diffHunks(lines, b.split('\n')).forEach((h) => hunks.push({
      cls: classifyHunk(h), old: h.old, new: h.new, around: [shape(lines[h.at - 1]), shape(lines[h.at + h.old.length])],
    }));
  }
  const classes = {};
  hunks.forEach(({ cls }) => { classes[cls] = (classes[cls] || 0) + 1; });
  return { identical: false, classes, hunks };
};
