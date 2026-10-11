import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The JS side (`watchImmediate`) and the capability `fs:allow-watch` both looked fine while the Rust
// plugin was built WITHOUT its `watch` feature, so every call failed with "Command watch not found"
// and the app only noticed outside edits when the window regained focus.
describe('tauri fs plugin', () => {
  it('is built with the watch feature so external edits show up live', () => {
    const cargo = readFileSync(new URL('../../src-tauri/Cargo.toml', import.meta.url), 'utf8');
    const line = cargo.split('\n').find((l) => l.startsWith('tauri-plugin-fs'));
    expect(line).toMatch(/features\s*=\s*\[[^\]]*"watch"/);
  });

  it('grants the watch permissions', () => {
    const caps = readFileSync(new URL('../../src-tauri/capabilities/default.json', import.meta.url), 'utf8');
    expect(caps).toContain('fs:allow-watch');
    expect(caps).toContain('fs:allow-unwatch');
  });
});
