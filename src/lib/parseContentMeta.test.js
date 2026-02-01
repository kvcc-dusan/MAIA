import { describe, it, expect } from 'vitest';
import { parseContentMeta } from './parseContentMeta';

describe('parseContentMeta', () => {
    it('should extract tags', () => {
        const content = 'Hello #world this is a #test';
        const { tags } = parseContentMeta(content);
        expect(tags).toContain('world');
        expect(tags).toContain('test');
        expect(tags).toHaveLength(2);
    });

    it('should extract unique tags', () => {
        const content = '#repeat #repeat';
        const { tags } = parseContentMeta(content);
        expect(tags).toEqual(['repeat']);
    });

    it('should extract wikilinks', () => {
        const content = 'Check out [[Note A]] and [[Note B]].';
        const { links } = parseContentMeta(content);
        expect(links).toContain('Note A');
        expect(links).toContain('Note B');
    });

    it('should handle aliased wikilinks', () => {
        const content = 'See [[Real Note|Alias Name]]';
        const { links } = parseContentMeta(content);
        expect(links).toContain('Real Note');
        expect(links).toHaveLength(1);
    });

    it('should handle anchor wikilinks', () => {
        const content = 'See [[Real Note#Section A]]';
        const { links } = parseContentMeta(content);
        expect(links).toContain('Real Note');
    });

    it('should handle complex wikilinks', () => {
        const content = 'See [[Real Note#Section A|Alias]]';
        const { links } = parseContentMeta(content);
        expect(links).toContain('Real Note');
    });

    it('should ignore Obsidian comments', () => {
        const content = 'Visible %% #hidden [[HiddenLink]] %%';
        const { tags, links } = parseContentMeta(content);
        expect(tags).toHaveLength(0);
        expect(links).toHaveLength(0);
    });
});
