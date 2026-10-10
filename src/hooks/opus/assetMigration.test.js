// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { migrateLegacyAssets, dataUrlToBytes, ASSETS_MIGRATED_KEY } from "./assetMigration.js";

const PNG = "data:image/png;base64,AQID"; // bytes 1,2,3
const projects = [{ id: "p1" }, { id: "p2" }];

const makeApi = (existing = []) => ({
  listAssets: vi.fn(async () => existing),
  saveAsset: vi.fn(async () => ({})),
});

describe("migrateLegacyAssets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("decodes base64 data URLs", () => {
    expect(dataUrlToBytes(PNG)).toEqual(new Uint8Array([1, 2, 3]));
    expect(dataUrlToBytes("nope")).toBeNull();
  });

  it("copies dataUrl assets, skips disk-path ones, sets the flag and keeps the legacy data", async () => {
    const legacy = { p1: [{ id: "a", name: "pic.png", dataUrl: PNG }, { id: "b", name: "x.pdf", path: "/v/.maia-assets/p1/b-x.pdf" }] };
    localStorage.setItem("maia.projectAssets", JSON.stringify(legacy));
    const api = makeApi();
    expect(await migrateLegacyAssets(api, "/v", projects)).toBe("done");
    expect(api.saveAsset).toHaveBeenCalledTimes(1);
    expect(api.saveAsset).toHaveBeenCalledWith("/v", "p1", { name: "pic.png", bytes: new Uint8Array([1, 2, 3]) });
    expect(localStorage.getItem(ASSETS_MIGRATED_KEY)).toBe("true");
    expect(JSON.parse(localStorage.getItem("maia.projectAssets"))).toEqual(legacy);
  });

  it("reads assets from browser-mode projects too, and skips a file already copied", async () => {
    localStorage.setItem("maia.projects", JSON.stringify([{ id: "p2", assets: [{ name: "pic.png", dataUrl: PNG }] }]));
    const api = makeApi([{ name: "Pic.png", size: 3 }]);
    expect(await migrateLegacyAssets(api, "/v", projects)).toBe("done");
    expect(api.saveAsset).not.toHaveBeenCalled();
  });

  it("does nothing once the flag is set", async () => {
    localStorage.setItem(ASSETS_MIGRATED_KEY, "true");
    localStorage.setItem("maia.projectAssets", JSON.stringify({ p1: [{ name: "a.png", dataUrl: PNG }] }));
    const api = makeApi();
    expect(await migrateLegacyAssets(api, "/v", projects)).toBe("skipped");
    expect(api.saveAsset).not.toHaveBeenCalled();
  });

  it("reports a failure with a toast and leaves the flag unset", async () => {
    localStorage.setItem("maia.projectAssets", JSON.stringify({ p1: [{ name: "a.png", dataUrl: PNG }] }));
    const api = makeApi();
    api.saveAsset.mockRejectedValueOnce(new Error("disk full"));
    expect(await migrateLegacyAssets(api, "/v", projects)).toBe("failed");
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("disk full"));
    expect(localStorage.getItem(ASSETS_MIGRATED_KEY)).toBeNull();
  });
});
