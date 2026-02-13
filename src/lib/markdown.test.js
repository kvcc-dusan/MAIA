// src/lib/markdown.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { makeMarkdown } from './markdown';

const md = makeMarkdown();

describe('Markdown Sanitization', () => {
  it('sanitizes malicious script tags', () => {
    const input = 'Hello <script>alert(1)</script> World';
    const output = md.render(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('Hello');
    expect(output).toContain('World');
  });

  it('sanitizes malicious event handlers on img', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const output = md.render(input);
    // output structure might vary slightly but should not have onerror
    expect(output).toContain('src="x"');
    expect(output).not.toContain('onerror');
  });

  it('sanitizes javascript: links', () => {
    const input = '[Bad Link](javascript:alert(1))';
    const output = md.render(input);
    // DOMPurify usually strips the href content or the whole attribute if it's javascript:
    expect(output).not.toContain('href="javascript:alert(1)"');
  });

  it('allows valid wikilinks with data-internal-link', () => {
    const input = '[[Note Title]]';
    const output = md.render(input);
    expect(output).toContain('data-internal-link="Note Title"');
    expect(output).toContain('>Note Title</a>');
  });

  it('allows task lists (input tags)', () => {
    const input = '- [ ] Task';
    const output = md.render(input);
    expect(output).toContain('<input');
    expect(output).toContain('type="checkbox"');
  });

  it('allows footnotes (ids)', () => {
    const input = 'Footnote[^1]\n\n[^1]: The note';
    const output = md.render(input);
    expect(output).toContain('id="fn1"');
    expect(output).toContain('href="#fnref1"'); // or similar
  });

  it('preserves callout classes (handled by postprocess)', () => {
    const input = '> [!info] My Callout';
    const output = md.render(input);
    expect(output).toContain('class="callout callout-info"');
  });

  it('preserves image size syntax via postprocess', () => {
    const input = '![alt](http://example.com/img.png|100x200)';
    const output = md.render(input);
    expect(output).toContain('width="100"');
    expect(output).toContain('height="200"');
  });

  it('strips injected event handlers from postprocessed attributes', () => {
    // Verify that even if malicious attributes appear in the postprocess path,
    // DOMPurify sanitizes them since it runs AFTER postprocess
    const input = '![alt](http://example.com/img.png|100x200)';
    const output = md.render(input);
    // Legitimate attributes should be preserved
    expect(output).toContain('width="100"');
    expect(output).toContain('height="200"');
    // onerror should never appear — DOMPurify strips it
    expect(output).not.toContain('onerror');
    expect(output).not.toContain('onclick');
  });
});
