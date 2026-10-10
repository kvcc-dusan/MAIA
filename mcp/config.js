// Vault location comes from MAIA_VAULT only. Fails fast with a readable message.
import fs from "node:fs/promises";
import path from "node:path";
import { OPUS_DIR } from "./fsx.js";

export const resolveVault = async (env = process.env) => {
  const raw = env.MAIA_VAULT;
  if (!raw || !raw.trim()) {
    throw new Error("MAIA_VAULT is not set. Point it at your MAIA vault folder, e.g. MAIA_VAULT=/Users/me/Vault");
  }
  const vault = path.resolve(raw.trim().replace(/^~(?=$|\/)/, env.HOME ?? ""));
  let stat;
  try {
    stat = await fs.stat(vault);
  } catch {
    throw new Error(`MAIA_VAULT "${vault}" does not exist.`);
  }
  if (!stat.isDirectory()) throw new Error(`MAIA_VAULT "${vault}" is not a folder.`);
  const opus = path.join(vault, OPUS_DIR);
  try {
    await fs.mkdir(opus, { recursive: true });
  } catch (e) {
    throw new Error(`Cannot use "${opus}": ${e?.message ?? e}`);
  }
  return vault;
};
