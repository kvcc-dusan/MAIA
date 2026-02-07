import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class strings', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('resolves tailwind conflicts', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('p-4 p-2')).toBe('p-2');
  });

  it('handles arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('handles objects', () => {
    expect(cn({ class1: true, class2: false })).toBe('class1');
  });

  it('handles mixed inputs', () => {
    expect(cn('class1', { class2: true }, ['class3', 'class4'])).toBe('class1 class2 class3 class4');
  });
});
