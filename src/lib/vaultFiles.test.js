import { describe, it, expect, vi } from 'vitest';
import {
  buildFileIndex, resolveVaultFile, listVaultFiles, normalizeRel, fileKind,
} from './vaultFiles.js';

const index = buildFileIndex([
  'attachments/deep/logo.png',
  'logo.png',
  'img/Logo.png',
  'Projects/Alpha/pics/diagram.png',
  'Projects/Alpha/spec.pdf',
  'docs/spec.pdf',
]);

describe('resolveVaultFile', () => {
  it('finds a bare name anywhere and the shortest path wins', () => {
    expect(resolveVaultFile(index, 'logo.png', 'Projects/Alpha')).toBe('logo.png');
    expect(resolveVaultFile(index, 'diagram.png')).toBe('Projects/Alpha/pics/diagram.png');
    expect(resolveVaultFile(index, 'spec.pdf')).toBe('docs/spec.pdf');
  });

  it('is case-insensitive and returns the real casing', () => {
    expect(resolveVaultFile(index, 'DIAGRAM.PNG')).toBe('Projects/Alpha/pics/diagram.png');
  });

  it('resolves relative paths against the note folder first', () => {
    expect(resolveVaultFile(index, 'pics/diagram.png', 'Projects/Alpha')).toBe('Projects/Alpha/pics/diagram.png');
    expect(resolveVaultFile(index, '../Alpha/spec.pdf', 'Projects/Alpha')).toBe('Projects/Alpha/spec.pdf');
    expect(resolveVaultFile(index, './spec.pdf', 'Projects/Alpha', { preferRelative: true })).toBe('Projects/Alpha/spec.pdf');
  });

  it('prefers the note folder for markdown links with a bare name', () => {
    expect(resolveVaultFile(index, 'spec.pdf', 'Projects/Alpha', { preferRelative: true })).toBe('Projects/Alpha/spec.pdf');
  });

  it('falls back to the vault root and then to a path tail', () => {
    expect(resolveVaultFile(index, 'img/Logo.png', 'Somewhere/else')).toBe('img/Logo.png');
    expect(resolveVaultFile(index, 'pics/diagram.png', 'Elsewhere')).toBe('Projects/Alpha/pics/diagram.png');
    expect(resolveVaultFile(index, '/docs/spec.pdf', 'Projects')).toBe('docs/spec.pdf');
  });

  it('returns null for missing files, empty targets and paths escaping the vault', () => {
    expect(resolveVaultFile(index, 'nope.png')).toBeNull();
    expect(resolveVaultFile(index, '  ')).toBeNull();
    expect(resolveVaultFile(index, '../../../logo.png', 'a')).toBeNull();
  });

  it('works on an empty vault', () => {
    expect(resolveVaultFile(buildFileIndex([]), 'a.png')).toBeNull();
  });
});

describe('helpers', () => {
  it('normalizes paths', () => {
    expect(normalizeRel('a/./b/../c')).toBe('a/c');
    expect(normalizeRel('../x')).toBeNull();
  });

  it('classifies files', () => {
    expect(['a.PNG', 'b.pdf', 'c.mp3', 'd.mov', 'e.zip', 'Note', 'n.md'].map(fileKind))
      .toEqual(['image', 'pdf', 'audio', 'video', 'file', 'note', 'note']);
  });
});

describe('listVaultFiles', () => {
  const tree = {
    '/v': [
      { name: 'a.png', isFile: true }, { name: 'n.md', isFile: true }, { name: '.hidden.png', isFile: true },
      { name: 'Opus', isDirectory: true }, { name: '.git', isDirectory: true }, { name: 'node_modules', isDirectory: true },
      { name: 'img', isDirectory: true },
    ],
    '/v/img': [{ name: 'b.pdf', isFile: true }, { name: 'Opus', isDirectory: true }],
    '/v/img/Opus': [{ name: 'c.png', isFile: true }],
  };
  const readDir = vi.fn(async (path) => {
    if (!tree[path]) throw new Error('nope');
    return tree[path];
  });

  it('lists only attachments, skipping notes, dot folders, node_modules and root Opus', async () => {
    expect(await listVaultFiles('/v', readDir)).toEqual(['a.png', 'img/Opus/c.png', 'img/b.pdf']);
    expect(readDir).not.toHaveBeenCalledWith('/v/Opus');
  });

  it('stops at the limit', async () => {
    expect(await listVaultFiles('/v', readDir, { limit: 1 })).toHaveLength(1);
  });

  it('survives an unreadable subfolder', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const files = await listVaultFiles('/v', async (p) => {
      if (p === '/v/img') throw new Error('denied');
      return tree[p];
    });
    expect(files).toEqual(['a.png']);
    spy.mockRestore();
  });
});
