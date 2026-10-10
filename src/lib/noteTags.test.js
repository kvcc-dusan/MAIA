import { describe, it, expect } from 'vitest';
import { noteTags } from './noteTags';

describe('noteTags', () => {
    it('returns frontmatter tags only when the body has none', () => {
        expect(noteTags({ tags: ['alpha', 'beta'], content: 'no tags here' })).toEqual(['alpha', 'beta']);
    });

    it('returns inline tags only when frontmatter is missing', () => {
        expect(noteTags({ content: 'Hello #gamma and #delta' })).toEqual(['gamma', 'delta']);
    });

    it('merges both sources and dedupes case-insensitively, keeping the first spelling', () => {
        const note = { tags: ['Alpha', 'beta'], content: '#alpha #gamma #BETA' };
        expect(noteTags(note)).toEqual(['Alpha', 'beta', 'gamma']);
    });

    it('ignores tags inside Obsidian comments (via parseContentMeta)', () => {
        expect(noteTags({ content: 'Visible %% #hidden %%' })).toEqual([]);
    });

    it('tolerates undefined note fields', () => {
        expect(noteTags(undefined)).toEqual([]);
        expect(noteTags({})).toEqual([]);
        expect(noteTags({ tags: undefined, content: undefined })).toEqual([]);
        expect(noteTags({ tags: null, content: null })).toEqual([]);
    });

    it('accepts a single string as frontmatter tags', () => {
        expect(noteTags({ tags: 'solo' })).toEqual(['solo']);
    });

    it('drops non-string and empty frontmatter entries', () => {
        expect(noteTags({ tags: [null, 42, '', '  ', 'ok'] })).toEqual(['ok']);
    });

    it('strips leading # from frontmatter and inline tags', () => {
        expect(noteTags({ tags: ['#hash'], content: '#inline' })).toEqual(['hash', 'inline']);
    });

    it('does not mutate the note', () => {
        const note = { tags: ['alpha'], content: '#beta' };
        noteTags(note);
        expect(note).toEqual({ tags: ['alpha'], content: '#beta' });
    });
});
