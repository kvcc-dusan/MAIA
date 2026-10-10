// Builds the MCP server with all tool groups registered.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRead } from "./tools/read.js";
import { registerProjectWrites } from "./tools/projects.js";
import { registerTaskWrites } from "./tools/tasks.js";
import { registerItemWrites } from "./tools/items.js";
import { registerNotes } from "./tools/notes.js";

export const createServer = (vault) => {
  const server = new McpServer({ name: "maia", version: "0.1.0" });
  registerRead(server, vault);
  registerProjectWrites(server, vault);
  registerTaskWrites(server, vault);
  registerItemWrites(server, vault);
  registerNotes(server, vault);
  return server;
};
