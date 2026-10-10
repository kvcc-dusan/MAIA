// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTripMarkdown } from './roundTripSafe.js';

describe('strict linkify', () => {
  it.each([
    'Hosted at aiatlas.inova.si for now.',
    'Read CLAUDE.md before editing.',
    'Mail name.surname@mail.si or odoo.com/pricing.',
    'Tools: Forecast.it, Beebole, Nutcache.',
  ])('keeps plain text that only looks like an address: %s', (md) => {
    expect(roundTripMarkdown(md)).toBe(md);
  });

  it('still treats an explicit URL as a link without changing its text', () => {
    expect(roundTripMarkdown('See [site](https://example.com) and <https://example.org>.')).toBe(
      'See [site](https://example.com) and <https://example.org>.',
    );
  });
});

describe('bare URLs', () => {
  it('keep their percent-encoding in the visible text', () => {
    const out = roundTripMarkdown('Source: https://www.figma.com/design/abc/WEB2.0%7Cx?node-id=1-2');
    expect(out).toContain('WEB2.0%7Cx');
    expect(out).not.toContain('WEB2.0|x');
  });
});
