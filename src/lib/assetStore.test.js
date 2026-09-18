// @vitest-environment jsdom
//
// assetStore.js is the disk I/O boundary for project assets in the Tauri
// build (STATE_OF_MAIA.md flagged base64-in-localStorage assets as a P0
// quota-exhaustion risk). Mocks a tiny in-memory filesystem behind
// @tauri-apps/plugin-fs, same pattern as vault.test.js.
import { describe, it, expect, beforeEach, vi } from "vitest";

let fsState;

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn((dir) => {
    fsState.dirs.add(dir);
    return Promise.resolve();
  }),
  writeFile: vi.fn((path, data) => {
    fsState.files[path] = data;
    return Promise.resolve();
  }),
  readFile: vi.fn((path) => {
    if (!(path in fsState.files)) return Promise.reject(new Error(`ENOENT: ${path}`));
    return Promise.resolve(fsState.files[path]);
  }),
  remove: vi.fn((path) => {
    delete fsState.files[path];
    return Promise.resolve();
  }),
  exists: vi.fn((path) => Promise.resolve(path in fsState.files)),
}));

vi.mock("./vault.js", () => ({
  getVaultPath: vi.fn(() => "/mock/vault"),
}));

const VAULT = "/mock/vault";

const importAssetStore = () => import("./assetStore.js");

describe("assetStore.js", () => {
  beforeEach(() => {
    fsState = { files: {}, dirs: new Set() };
    vi.resetModules();
  });

  it("saveAssetFile creates the project's asset dir and writes the file to the expected path", async () => {
    const { saveAssetFile } = await importAssetStore();
    const bytes = new TextEncoder().encode("hello world").buffer;

    const path = await saveAssetFile(VAULT, "proj1", "asset1", "photo.png", bytes);

    expect(path).toBe(`${VAULT}/.maia-assets/proj1/asset1-photo.png`);
    expect(fsState.dirs.has(`${VAULT}/.maia-assets/proj1`)).toBe(true);
    expect(fsState.files[path]).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(fsState.files[path])).toBe("hello world");
  });

  it("saveAssetFile writes distinct paths for different assets in the same project", async () => {
    const { saveAssetFile } = await importAssetStore();
    const bytes = new TextEncoder().encode("x").buffer;

    const pathA = await saveAssetFile(VAULT, "proj1", "a1", "one.png", bytes);
    const pathB = await saveAssetFile(VAULT, "proj1", "a2", "two.png", bytes);

    expect(pathA).not.toBe(pathB);
    expect(Object.keys(fsState.files)).toHaveLength(2);
  });

  it("deleteAssetFile removes an existing file", async () => {
    const { saveAssetFile, deleteAssetFile } = await importAssetStore();
    const bytes = new TextEncoder().encode("x").buffer;
    const path = await saveAssetFile(VAULT, "proj1", "a1", "one.png", bytes);
    expect(fsState.files[path]).toBeDefined();

    await deleteAssetFile(path);

    expect(fsState.files[path]).toBeUndefined();
  });

  it("deleteAssetFile no-ops gracefully when the file doesn't exist", async () => {
    const { deleteAssetFile } = await importAssetStore();

    await expect(deleteAssetFile(`${VAULT}/.maia-assets/proj1/missing-file.png`)).resolves.not.toThrow();
  });

  it("readAssetFile returns the raw bytes written by saveAssetFile", async () => {
    const { saveAssetFile, readAssetFile } = await importAssetStore();
    const bytes = new TextEncoder().encode("raw bytes here").buffer;
    const path = await saveAssetFile(VAULT, "proj1", "a1", "doc.pdf", bytes);

    const readBack = await readAssetFile(path);

    expect(new TextDecoder().decode(readBack)).toBe("raw bytes here");
  });

  it("assetsDir builds a hidden subfolder path off the vault root", async () => {
    const { assetsDir } = await importAssetStore();
    expect(assetsDir("/some/vault")).toBe("/some/vault/.maia-assets");
    expect(assetsDir("/some/vault/")).toBe("/some/vault/.maia-assets");
  });
});
