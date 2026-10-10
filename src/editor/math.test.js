// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { roundTrip, nodeTypes } from './testHelpers.js';

const LOSSLESS = [
  'Euler $e^{i\\pi}+1=0$ ok',
  'x $a_1 + b_2$ y',
  '$\\frac{a}{b}$',
  '$$\n\\int_0^1 x^2 dx\n$$',
  '$$ x_1^2 $$',
  '$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$',
  'inline display $$x^2$$ in text',
  'costs $5 and $10 today',
  'price $5, and math $x_1$ here',
  '- item with $\\alpha$\n- two',
  '$a \\$ b$',
  '`$not math$` and \\$escaped\\$',
];

describe('math passthrough', () => {
  it.each(LOSSLESS)('round-trips byte for byte, backslashes intact: %j', (md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('never doubles backslashes', () => {
    expect(roundTrip('$\\frac{a}{b}$')).toBe('$\\frac{a}{b}$');
  });

  it('uses atoms for math and not for currency', () => {
    expect(nodeTypes('$x_1$').has('mathInline')).toBe(true);
    expect(nodeTypes('$$\nx\n$$').has('mathBlock')).toBe(true);
    expect(nodeTypes('costs $5 and $10').has('mathInline')).toBe(false);
  });

  it('keeps math out of emphasis parsing', () => {
    expect(nodeTypes('$a*b*c$').has('mathInline')).toBe(true);
    expect(roundTrip('$a*b*c$ and *real*')).toBe('$a*b*c$ and *real*');
  });
});
