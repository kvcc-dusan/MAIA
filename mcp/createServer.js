// Builds the MCP server with all tool groups registered.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRead } from "./tools/read.js";
import { registerProjectWrites } from "./tools/projects.js";
import { registerTaskWrites } from "./tools/tasks.js";
import { registerItemWrites } from "./tools/items.js";
import { registerNotes } from "./tools/notes.js";
import { registerAgenda } from "./tools/agenda.js";
import { registerReport } from "./tools/report.js";
import { registerTrash } from "./tools/trash.js";
import { registerExtras } from "./tools/extras.js";
import { scrubPathsFor } from "./tools/util.js";

export const createServer = (vault) => {
  scrubPathsFor(vault);
  const server = new McpServer({ name: "maia", version: "0.2.0" });
  registerRead(server, vault);
  registerProjectWrites(server, vault);
  registerTaskWrites(server, vault);
  registerItemWrites(server, vault);
  registerNotes(server, vault);
  registerAgenda(server, vault);
  registerReport(server, vault);
  registerTrash(server, vault);
  registerExtras(server, vault);
  return server;
};
