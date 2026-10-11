// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

const load = async () => {
  const mod = await import('./theme.js?' + Math.random());
  return mod;
};

describe('theme modes', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-variant');
  });

  it('black is a dark variant: data-theme stays dark and data-variant says black', async () => {
    const { setTheme, resolveTheme } = await load();
    setTheme('black');
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.getAttribute('data-variant')).toBe('black');
    expect(resolveTheme()).toBe('dark');
  });

  it('leaving black removes the variant', async () => {
    const { setTheme } = await load();
    setTheme('black');
    setTheme('dark');
    expect(document.documentElement.hasAttribute('data-variant')).toBe(false);
    setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('remembers the choice', async () => {
    const { setTheme } = await load();
    setTheme('black');
    const again = await load();
    expect(again.getTheme()).toBe('black');
  });

  it('ignores unknown modes', async () => {
    const { setTheme, getTheme } = await load();
    setTheme('pink');
    expect(getTheme()).toBe('system');
  });
});
