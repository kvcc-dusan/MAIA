import { Editor } from '@tiptap/core';
import { getVaultPath, isTauri } from '../lib/vault.js';
import { findVaultFile, fileKind } from '../lib/vaultFiles.js';

const norm = (s) => (s || '').trim().toLowerCase();
const stripMd = (s) => s.replace(/\.md$/i, '');

const defaultAssetUrl = async (vaultPath, rel) => {
  // dynamic: the web bundle must not pull in Tauri code
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  return convertFileSrc(`${vaultPath.replace(/\/+$/, '')}/${rel}`);
};

/** `Note`, `Folder/Note` and `Note.md` all point at the same note; the shallowest one wins. */
export const findNote = (notes, target) => {
  const wanted = norm(stripMd(target));
  if (!wanted) return null;
  const matches = notes.filter((n) => {
    const full = norm(n.folder ? `${n.folder}/${n.title}` : n.title);
    return norm(n.title) === wanted || full === wanted || full.endsWith(`/${wanted}`);
  });
  matches.sort((a, b) => (a.folder || '').split('/').length - (b.folder || '').split('/').length);
  return matches[0] ?? null;
};

/**
 * What embeds and local images need from the app: the vault, the notes list and the open
 * note's folder. Null on the web, where the editor keeps its plain chips. The getters are read
 * at call time because the editor outlives the note it shows.
 */
export const createEmbedProvider = ({
  getNotes, getFolder, onOpenNote, createExtensions,
  getVault = getVaultPath, isDesktop = isTauri, findFile = findVaultFile, toAssetUrl = defaultAssetUrl,
}) => {
  if (!isDesktop()) return null;
  return {
    isActive: () => Boolean(getVault()),

    findNote: (target) => findNote(getNotes(), target),

    async resolveFile(target, options) {
      const vault = getVault();
      if (!vault) return null;
      const rel = await findFile(vault, target, getFolder(), options);
      if (!rel) return null;
      const kind = fileKind(rel);
      return { rel, kind, name: rel.slice(rel.lastIndexOf('/') + 1), url: kind === 'image' ? await toAssetUrl(vault, rel) : '' };
    },

    openNote: (title) => onOpenNote?.(title),

    // Embedded notes render with the full extension list but no provider, which is what
    // stops an embed inside an embed (depth limit 1, so cycles cannot happen). The factory is
    // passed in because extensions.js depends on this provider's consumers.
    renderNote: async (markdown, element) => {
      const editor = new Editor({
        element, editable: false, content: markdown, extensions: createExtensions({ onOpenLink: onOpenNote }),
      });
      return () => editor.destroy();
    },
  };
};
