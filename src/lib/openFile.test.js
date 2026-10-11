import { describe, it, expect, vi, beforeEach } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));
import { openVaultFile } from './openFile.js';

beforeEach(() => toastError.mockClear());

describe('openVaultFile', () => {
  it('invokes the command with the joined path', async () => {
    const invokeFn = vi.fn().mockResolvedValue(undefined);
    expect(await openVaultFile('/v/', 'docs/a.pdf', { invokeFn })).toBe(true);
    expect(invokeFn).toHaveBeenCalledWith('open_in_default_app', { path: '/v/docs/a.pdf' });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows plain-language copy for a denied type', async () => {
    const invokeFn = vi.fn().mockRejectedValue('blocked_type');
    expect(await openVaultFile('/v', 'x.sh', { invokeFn })).toBe(false);
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('will not open programs'));
  });

  it('explains a refused web document', async () => {
    const invokeFn = vi.fn().mockRejectedValue('blocked_web');
    expect(await openVaultFile('/v', 'page.html', { invokeFn })).toBe(false);
    expect(toastError).toHaveBeenCalledWith('Open it from Finder if you trust it.');
  });

  it('shows a generic message for unknown errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invokeFn = vi.fn().mockRejectedValue(new Error('boom'));
    await openVaultFile('/v', 'a.pdf', { invokeFn });
    expect(toastError).toHaveBeenCalledWith('Could not open that file.');
    spy.mockRestore();
  });

  it('toasts instead of invoking on the web', async () => {
    expect(await openVaultFile('/v', 'a.pdf')).toBe(false);
    expect(toastError).toHaveBeenCalledWith('Opening files needs the desktop app.');
  });
});
