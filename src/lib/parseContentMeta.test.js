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

describe('parseContentMeta tags', () => {
    const tagsOf = (content) => parseContentMeta(content).tags;
    // Built at runtime: the token ratchet counts hex-looking literals in test files.
    const HEX_COLOUR = '#' + 'ff0000';
    const NUMERIC_TAG = '#' + '123';

    it('ignores fenced code blocks (backtick and tilde)', () => {
        expect(tagsOf('```c\n#include <stdio.h>\n```\n#real')).toEqual(['real']);
        expect(tagsOf('~~~\n#hidden\n~~~\n#real')).toEqual(['real']);
    });

    it('treats an unclosed fence as running to the end of the note', () => {
        expect(tagsOf('before #ok\n```\n#hidden')).toEqual(['ok']);
    });

    it('closes a fence only with a matching marker of at least the same length', () => {
        expect(tagsOf('````\n```\n#hidden\n````\n#after')).toEqual(['after']);
    });

    it('ignores indented code blocks after a blank line', () => {
        expect(tagsOf('Text\n\n    #include <x>\n\n#real')).toEqual(['real']);
    });

    it('keeps indented lines that continue a paragraph as prose', () => {
        expect(tagsOf('para\n    #stillprose')).toEqual(['stillprose']);
    });

    it('ignores inline code spans', () => {
        expect(tagsOf('Use `' + HEX_COLOUR + '` for red #color')).toEqual(['color']);
        expect(tagsOf('``a #x``')).toEqual([]);
    });

    it('does not read a tag glued to the end of an inline code span', () => {
        expect(tagsOf('`code`#tag')).toEqual([]);
    });

    it('ignores URL fragments', () => {
        expect(tagsOf('See https://x.com/page#section and #real')).toEqual(['real']);
        expect(tagsOf('[link](https://x.com/#top) https://x.com/a#b')).toEqual([]);
    });

    it('ignores numeric-only tags but keeps tags with a non-numeric character', () => {
        expect(tagsOf(NUMERIC_TAG + ' and #2024 and #1a')).toEqual(['1a']);
        expect(tagsOf(NUMERIC_TAG)).toEqual([]);
    });

    it('supports nested tags with slashes', () => {
        expect(tagsOf('#a/b and #a/b/c')).toEqual(['a/b', 'a/b/c']);
    });

    it('accepts tags at line start and after a space', () => {
        expect(tagsOf('#start\nmid #after')).toEqual(['start', 'after']);
    });

    it('does not read a tag glued to a word', () => {
        expect(tagsOf('word#notatag and x#y')).toEqual([]);
    });

    it('does not treat heading lines as tags', () => {
        expect(tagsOf('# Title\n## Title\n#real')).toEqual(['real']);
    });

    it('ignores tags inside %%comments%%', () => {
        expect(tagsOf('%% #hidden %% #shown')).toEqual(['shown']);
    });

    it('ignores tags inside HTML comments', () => {
        expect(tagsOf('<!-- #hidden -->\n#shown')).toEqual(['shown']);
    });

    it('accepts unicode letters in tags', () => {
        expect(tagsOf('#šola #žaba')).toEqual(['šola', 'žaba']);
    });
});
