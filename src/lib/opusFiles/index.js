// @maia:opusFiles - Opus projects, tasks, decisions and questions as Markdown files.
//
// Layout inside the user's vault folder (Tauri only; web keeps localStorage):
//   <vault>/Opus/
//     <Project name>/project.md          frontmatter + description body
//     <Project name>/tasks/<Title>.md    one file per task
//     <Project name>/decisions/<Title>.md
//     <Project name>/questions/<Question text>.md
//     <Project name>/assets/<any file>   project files, listed from disk (no metadata record)
//     _inbox/tasks/<Title>.md            tasks without a project
//     _backups/backup-<time>.json        safety backups written before an import
// Items reference workstreams by name and milestones by title; ids live in
// frontmatter. Notes never see this folder: loadNotes reads only the vault's top level.
export { loadOpus } from "./opusLoad.js";
export { saveProject, saveTask, saveDecision, saveQuestion, deleteItem, moveTask } from "./opusVault.js";
export { listAssets, saveAsset, deleteAsset, readAsset, mimeFor } from "./assetFiles.js";
export { watchOpus } from "./opusWatch.js";
export { getOpusMeta, resetOpusState, OPUS_DIR, INBOX_DIR, BACKUPS_DIR, ASSETS_DIR } from "./opusFs.js";
export { contextOf } from "./projectFile.js";
export * as projectFile from "./projectFile.js";
export * as taskFile from "./taskFile.js";
export * as decisionFile from "./decisionFile.js";
export * as questionFile from "./questionFile.js";
export { projectFolderName, taskFileName, decisionFileName, questionFileName } from "./names.js";
