import { describe, it, expect } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_DISK_FILE_BYTES,
  MAX_WEB_ASSETS_BASE64_BYTES,
  isImageType,
  isPdfType,
  formatBytes,
  base64Length,
  webAssetsUsage,
  validateFile,
} from "./assetRules.js";

const file = (name, size) => ({ name, size });

describe("file typing", () => {
  it("recognizes images and pdfs", () => {
    expect(isImageType("image/png")).toBe(true);
    expect(isImageType("application/pdf")).toBe(false);
    expect(isImageType("")).toBe(false);
    expect(isImageType(undefined)).toBe(false);
    expect(isPdfType("application/pdf")).toBe(true);
    expect(isPdfType("image/png")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(7.25 * 1024 * 1024)).toBe("7.3 MB");
  });
});

describe("web budget", () => {
  it("sizes base64 text from bytes", () => {
    expect(base64Length(3)).toBe(4);
    expect(base64Length(4)).toBe(8);
    expect(base64Length(0)).toBe(0);
  });

  it("sums only dataUrl-backed assets", () => {
    expect(webAssetsUsage([{ dataUrl: "abcd" }, { path: "/x" }, { dataUrl: "ef" }])).toBe(6);
    expect(webAssetsUsage([])).toBe(0);
  });
});

describe("validateFile", () => {
  it("accepts a file that fits", () => {
    expect(validateFile(file("a.png", 1024), { isDisk: false, usage: 0 })).toBeNull();
  });

  it("rejects a web file over 5 MB, naming the file and the fix", () => {
    const result = validateFile(file("deck.pdf", MAX_FILE_BYTES + 1), { isDisk: false });
    expect(result.code).toBe("too-large");
    expect(result.message).toContain("deck.pdf");
    expect(result.message).toContain("5.0 MB");
    expect(result.message).toMatch(/Compress it/);
  });

  it("lets vault files past 5 MB up to 250 MB, then explains the limit", () => {
    expect(validateFile(file("a.zip", MAX_FILE_BYTES * 20), { isDisk: true })).toBeNull();
    expect(validateFile(file("a.zip", MAX_DISK_FILE_BYTES), { isDisk: true })).toBeNull();
    const result = validateFile(file("big.zip", MAX_DISK_FILE_BYTES + 1), { isDisk: true });
    expect(result.code).toBe("too-large");
    expect(result.message).toContain("250.0 MB");
  });

  it("accepts a web file of exactly the cap", () => {
    expect(validateFile(file("a.bin", MAX_FILE_BYTES), { isDisk: false })).toBeNull();
  });

  it("rejects when the web budget would be exceeded, counting the new file", () => {
    const nearlyFull = MAX_WEB_ASSETS_BASE64_BYTES - 100;
    const result = validateFile(file("b.png", 1024), { isDisk: false, usage: nearlyFull });
    expect(result.code).toBe("quota");
    expect(result.message).toContain("b.png");
    expect(result.message).toMatch(/Delete a file/);
  });

  it("ignores the web budget for disk-backed storage", () => {
    expect(validateFile(file("b.png", 1024), { isDisk: true, usage: MAX_WEB_ASSETS_BASE64_BYTES * 2 })).toBeNull();
  });
});
