import { describe, it, expect, vi } from "vitest";
import { writeTextAtomic, tmpPathOf, ATOMIC_WRITES } from "./atomicWrite.js";

const makeFs = (over = {}) => {
  const files = {};
  const fs = {
    files,
    writeTextFile: vi.fn(async (p, t) => { files[p] = t; }),
    rename: vi.fn(async (a, b) => { files[b] = files[a]; delete files[a]; }),
    remove: vi.fn(async (p) => { delete files[p]; }),
    ...over,
  };
  return fs;
};

describe("writeTextAtomic", () => {
  it("is on by default", () => {
    expect(ATOMIC_WRITES).toBe(true);
  });

  it("names the temp file without a leading dot", () => {
    expect(tmpPathOf("/v/a/x.md")).toBe("/v/a/x.md.tmp");
  });

  it("writes the temp file, renames it over the target and leaves no temp", async () => {
    const fs = makeFs();
    fs.files["/v/x.md"] = "old";
    await writeTextAtomic(fs, "/v/x.md", "new");
    expect(fs.writeTextFile).toHaveBeenCalledWith("/v/x.md.tmp", "new");
    expect(fs.rename).toHaveBeenCalledWith("/v/x.md.tmp", "/v/x.md");
    expect(fs.files).toEqual({ "/v/x.md": "new" });
  });

  it("overwrites a stale temp left by a crash", async () => {
    const fs = makeFs();
    fs.files["/v/x.md.tmp"] = "half writt";
    await writeTextAtomic(fs, "/v/x.md", "full");
    expect(fs.files).toEqual({ "/v/x.md": "full" });
  });

  it("removes the temp and rethrows when rename fails, leaving the target alone", async () => {
    const fs = makeFs({ rename: vi.fn(async () => { throw new Error("EXDEV"); }) });
    fs.files["/v/x.md"] = "old";
    await expect(writeTextAtomic(fs, "/v/x.md", "new")).rejects.toThrow("EXDEV");
    expect(fs.files).toEqual({ "/v/x.md": "old" });
  });

  it("removes the temp and rethrows when the temp write fails", async () => {
    const fs = makeFs();
    fs.writeTextFile.mockRejectedValueOnce(new Error("disk full"));
    await expect(writeTextAtomic(fs, "/v/x.md", "new")).rejects.toThrow("disk full");
    expect(fs.remove).toHaveBeenCalledWith("/v/x.md.tmp");
  });

  it("still surfaces the original error when cleaning up the temp fails too", async () => {
    const fs = makeFs({
      rename: vi.fn(async () => { throw new Error("denied"); }),
      remove: vi.fn(async () => { throw new Error("also denied"); }),
    });
    await expect(writeTextAtomic(fs, "/v/x.md", "new")).rejects.toThrow("denied");
  });

  it("falls back to a direct write when rename refuses an existing target", async () => {
    const fs = makeFs({ rename: vi.fn(async () => { throw new Error("File exists (os error 17)"); }) });
    fs.files["/v/x.md"] = "old";
    await writeTextAtomic(fs, "/v/x.md", "new");
    expect(fs.files).toEqual({ "/v/x.md": "new" });
  });

  it("writes in place, with no rename, when atomic is off", async () => {
    const fs = makeFs();
    await writeTextAtomic(fs, "/v/x.md", "new", { atomic: false });
    expect(fs.writeTextFile).toHaveBeenCalledWith("/v/x.md", "new");
    expect(fs.rename).not.toHaveBeenCalled();
  });
});
