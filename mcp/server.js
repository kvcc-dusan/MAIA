#!/usr/bin/env node
// MAIA MCP server (stdio). Reads and writes the vault files directly; the
// app does not need to run. Config: MAIA_VAULT=<vault folder>.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveVault } from "./config.js";
import { createServer } from "./createServer.js";

const main = async () => {
  const vault = await resolveVault();
  await createServer(vault).connect(new StdioServerTransport());
  // stdout is the protocol channel; log to stderr only.
  console.error(`maia-mcp ready, vault: ${vault}`);
};

main().catch((e) => {
  console.error(`maia-mcp: ${e?.message ?? e}`);
  process.exit(1);
});
