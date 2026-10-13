# MAIA MCP server

Stdio MCP server that lets Claude read and write the MAIA vault files directly. The app does not need to run; its watcher and conflict guard pick up the edits. It reuses the app's own file codecs (`src/lib/opusFiles`), `applyTaskPatch` for status changes and `makeActivityEntry` for the activity log.

Config: `MAIA_VAULT` = the vault folder (required, must exist; `Opus/` is created if missing). Run: `node mcp/server.js` or `npm run mcp`.

## Tools

Read: `list_projects`, `get_project`, `list_tasks`, `get_task`, `list_decisions`, `list_questions`, `list_activity`, `list_notes`, `read_note`, `list_trash`, and `get_agenda` (what needs attention across projects: overdue, due today/soon, blocked, doing, next actions, blocking questions, milestones; use it for "what should I work on today").

Write: `create_project`, `update_project`, `add_workstream`, `add_milestone`, `create_task`, `update_task`, `add_decision`, `update_decision`, `add_question`, `update_question`, `answer_question`, `create_note`, and `weekly_report` (read-only unless `save: true`, which creates the `#report` note once; output is the app's own generator).

Delete (recoverable): `delete_task`, `delete_decision`, `delete_question` move the file to `Opus/_trash/<YYYY-MM-DD>/<Project folder or _inbox>/<tasks|decisions|questions>/<file>`; `restore_from_trash {path}` moves it back (path = `trashPath` from `list_trash`). Nothing is ever erased, and there are no project, note or asset delete tools. The app and the server both ignore `_trash/` (and `_backups/`) when loading. Restore refuses when the name is taken, the project folder is gone or the file no longer parses.

Every write appends an entry (with `actor: "claude-mcp"`) to the project's `activity.jsonl`, or `Opus/_inbox/activity.jsonl`. Dates in `get_agenda` and `weekly_report` are plain calendar days (UTC day numbers like the app's metrics); `today` defaults to this machine's local date, like the app.

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

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`). The desktop app cannot read
`~/Desktop` (macOS privacy), so it runs a one-file bundle outside the repo. Build it with `npm run mcp:bundle`
(also part of `npm run install-app`): it writes `~/.maia-mcp/server.mjs`, keeps the last one as
`server.previous.mjs`, and only replaces it once the new bundle has answered an MCP handshake on a throwaway vault.
The bundle is a snapshot: rebuild it after any change to `mcp/` or the app code it reuses, then restart Claude.
`command` is node's full path, since a GUI app does not see nvm's PATH.

```json
{
  "mcpServers": {
    "maia": {
      "command": "/Users/you/.nvm/versions/node/<version>/bin/node",
      "args": ["/Users/you/.maia-mcp/server.mjs"],
      "env": { "MAIA_VAULT": "/Users/you/Vault" }
    }
  }
}
```
