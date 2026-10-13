// Bundles the MCP server into one file outside the repo, for the Claude desktop app.
// The desktop app cannot read ~/Desktop (macOS privacy), so its config points at this bundle, not at mcp/server.js.
// The bundle is a snapshot: run this (npm run mcp:bundle, also part of npm run install-app) after any change to
// mcp/ or to the app code it reuses (src/lib/opusFiles, the task model), then restart the Claude desktop app.
//
// After building, it starts the bundle against a throwaway temp vault and checks it answers the MCP handshake,
// so a broken bundle never silently replaces a working one.
import { build } from "esbuild";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.env.MAIA_MCP_OUT || join(homedir(), ".maia-mcp", "server.mjs");
const HANDSHAKE_TIMEOUT_MS = 10000;
const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "mcp-bundle-check", version: "1" } },
};

/** Starts the bundle on a temp vault and resolves once it answers `initialize`. */
const checkHandshake = (file) =>
  new Promise((resolvePromise, reject) => {
    const vault = mkdtempSync(join(tmpdir(), "maia-mcp-check-"));
    const child = spawn(process.execPath, [file], { env: { ...process.env, MAIA_VAULT: vault }, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let done = false;
    const finish = (error) => {
      if (done) return; // killing the child fires "exit" after a success
      done = true;
      clearTimeout(timer);
      child.kill();
      rmSync(vault, { recursive: true, force: true });
      if (error) reject(error);
      else resolvePromise();
    };
    const timer = setTimeout(() => finish(new Error(`no handshake within ${HANDSHAKE_TIMEOUT_MS} ms\n${err}`)), HANDSHAKE_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      out += chunk;
      if (out.includes('"serverInfo"')) finish();
    });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("exit", (code) => finish(new Error(`server exited (${code}) before the handshake\n${err}`)));
    child.stdin.write(`${JSON.stringify(INITIALIZE)}\n`);
  });

// Node picks the module type from the extension, so the staged file must end in .mjs too.
const staged = OUT.replace(/\.mjs$/, "") + ".next.mjs";
mkdirSync(dirname(OUT), { recursive: true });
await build({
  entryPoints: [join(ROOT, "mcp/server.js")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: staged,
  // Some bundled CommonJS dependencies call require(); ESM output has none, so give it one.
  banner: { js: "import { createRequire as __maiaCreateRequire } from 'module'; const require = __maiaCreateRequire(import.meta.url);" },
  logLevel: "warning",
});

try {
  await checkHandshake(staged);
} catch (error) {
  rmSync(staged, { force: true });
  console.error(`MCP bundle failed its check, ${OUT} was left as it was.\n${error.message}`);
  process.exit(1);
}

if (existsSync(OUT)) copyFileSync(OUT, OUT.replace(/\.mjs$/, "") + ".previous.mjs");
renameSync(staged, OUT);
console.log(`MCP bundle written to ${OUT} and checked. Restart the Claude desktop app to load it.`);
