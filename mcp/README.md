# MAIA MCP server

Stdio MCP server that lets Claude read and write the MAIA vault files directly. The app does not need to run; its watcher and conflict guard pick up the edits. It reuses the app's own file codecs (`src/lib/opusFiles`), `applyTaskPatch` for status changes and `makeActivityEntry` for the activity log.

Config: `MAIA_VAULT` = the vault folder (required, must exist; `Opus/` is created if missing). Run: `node mcp/server.js` or `npm run mcp`.

## Tools

Read: `list_projects`, `get_project`, `list_tasks`, `get_task`, `list_decisions`, `list_questions`, `list_activity`, `list_notes`, `read_note`.

Write: `create_project`, `update_project`, `create_task`, `update_task`, `add_decision`, `add_question`, `answer_question`, `create_note`.

No delete tools; destructive actions stay in the app. Every write appends an entry (with `actor: "claude-mcp"`) to the project's `activity.jsonl`, or `Opus/_inbox/activity.jsonl`.

## Safety

- Unparsable files are reported in `list_projects` warnings and never overwritten.
- Untouched files are not rewritten; new files never replace existing ones (name collisions get " 2").
- Writes go to a visible `<file>.<pid>-<rand>.tmp` in the same folder, then rename. If the file changed on disk since it was read, the call returns a conflict error: re-read and retry.
- Names and folders are never renamed. Moving a task (`update_task` with `project`) writes the new file, then removes the old one only if it is unchanged.

## Register

Claude Code:

```bash
claude mcp add maia -e MAIA_VAULT=/Users/you/Vault -- node /Users/dusankvcc/Desktop/maia/mcp/server.js
```

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "maia": {
      "command": "node",
      "args": ["/Users/dusankvcc/Desktop/maia/mcp/server.js"],
      "env": { "MAIA_VAULT": "/Users/you/Vault" }
    }
  }
}
```
