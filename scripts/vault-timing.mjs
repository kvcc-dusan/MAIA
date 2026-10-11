// Read-only timing of a vault: node vault-timing.mjs <vaultPath>
import { readdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
const root = process.argv[2];
const skip = (n, atRoot) => n.startsWith(".") || n === "node_modules" || (atRoot && /^(opus|_backups)$/i.test(n));
const t = () => performance.now();
let t0 = t();
const files = [];
const walk = async (dir, atRoot) => {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (e) => {
    if (e.isDirectory()) { if (!skip(e.name, atRoot)) await walk(join(dir, e.name), false); }
    else if (e.isFile() && !e.name.startsWith(".") && /\.md$/i.test(e.name)) files.push(join(dir, e.name));
  }));
};
await walk(root, true);
const tList = t() - t0;
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); };
t0 = t(); let bytes = 0;
await pool(files, 16, async (f) => { bytes += (await stat(f)).size; });
const tStat = t() - t0;
t0 = t();
await pool(files, 8, async (f) => { await readFile(f, "utf8"); });
const tRead = t() - t0;
console.log(JSON.stringify({ files: files.length, bytes, listMs: Math.round(tList), statMs: Math.round(tStat), readMs: Math.round(tRead) }));
