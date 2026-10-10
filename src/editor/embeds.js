import { extractSection } from '../lib/noteSection.js';
import { fileKind } from '../lib/vaultFiles.js';

const SIZE = /^(\d+)(?:x(\d+))?$/;
const PAGE = /^page=(\d+)$/;
const KIND_LABEL = { pdf: 'PDF', audio: 'Audio', video: 'Video', file: 'File' };

/** `300` / `300x200`, the alias slot of `![[file.png|300]]`. */
export const parseEmbedSize = (text = '') => {
  const match = SIZE.exec(text.trim());
  return match ? { width: Number(match[1]), height: match[2] ? Number(match[2]) : null } : { width: null, height: null };
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const missingChip = (ref) => {
  const chip = el('span', 'maia-embed maia-embed-missing', ref.target || ref.raw);
  chip.title = `Not found: ${ref.raw}`;
  return chip;
};

const imageNode = (file, ref) => {
  const { width, height } = parseEmbedSize(ref.alias);
  const img = document.createElement('img');
  img.src = file.url;
  img.alt = ref.target;
  if (width) img.width = width;
  if (height) img.height = height;
  img.addEventListener('error', () => img.replaceWith(missingChip(ref)), { once: true });
  return img;
};

// Media and documents get a card only: playing or opening them needs the OS, not the webview.
const fileCard = (file, ref) => {
  const page = PAGE.exec(ref.subpath)?.[1];
  const card = el('span', 'maia-embed-file');
  card.title = file.rel;
  card.append(el('span', 'maia-embed-file-kind', KIND_LABEL[file.kind] ?? 'File'), el('span', 'maia-embed-file-name', file.name));
  if (page) card.append(el('span', 'maia-embed-file-detail', `Page ${page}`));
  return card;
};

const noteCard = (note, ref, provider, track) => {
  const card = el('span', 'maia-embed-note');
  const header = el('span', 'maia-embed-note-header');
  const open = el('button', 'maia-embed-open', 'Open note');
  open.type = 'button';
  open.addEventListener('click', () => provider.openNote(note.title));
  header.append(el('span', 'maia-embed-note-title', ref.subpath ? `${note.title} > ${ref.subpath}` : note.title), open);

  const body = el('span', 'maia-embed-note-body');
  const section = extractSection(note.content ?? '', ref.subpath);
  if (section === null) body.append(el('span', 'maia-embed-note-empty', 'Section not found'));
  else provider.renderNote(section, body).then(track).catch((e) => {
    console.error('[MAIA] Failed to render embedded note', e);
    body.replaceChildren(el('span', 'maia-embed-note-empty', 'Could not render this note'));
  });
  card.append(header, body);
  return card;
};

/**
 * Fills `dom` with what `![[target]]` points at. `ref` = { raw, target, subpath, alias }.
 * Shows whatever `dom` holds until the lookup finishes. Returns { destroy }.
 */
export const mountEmbed = (dom, ref, provider) => {
  let dead = false;
  let cleanup = null;
  const track = (destroy) => {
    if (dead) destroy();
    else cleanup = destroy;
  };
  const show = (child, block = false) => {
    if (dead) return;
    dom.classList.toggle('maia-embed-host-block', block);
    dom.replaceChildren(child);
  };

  const run = async () => {
    if (!ref.target) return;
    if (fileKind(ref.target) === 'note') {
      const note = provider.findNote(ref.target);
      show(note ? noteCard(note, ref, provider, track) : missingChip(ref), Boolean(note));
      return;
    }
    const file = await provider.resolveFile(ref.target);
    if (!file) show(missingChip(ref));
    else show(file.kind === 'image' ? imageNode(file, ref) : fileCard(file, ref));
  };
  run().catch((e) => {
    console.error('[MAIA] Failed to resolve embed', ref.raw, e);
    show(missingChip(ref));
  });

  return { destroy: () => { dead = true; cleanup?.(); } };
};
