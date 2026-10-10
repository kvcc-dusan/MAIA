// @maia:opusFiles - Opus projects, tasks, decisions and questions as Markdown files.
//
// Layout inside the user's vault folder (Tauri only; web keeps localStorage):
//   <vault>/Opus/
//     <Project name>/project.md          frontmatter + description body
//     <Project name>/tasks/<Title>.md    one file per task
//     <Project name>/decisions/<Title>.md
//     <Project name>/questions/<Question text>.md
//     _inbox/tasks/<Title>.md            tasks without a project
// Items reference workstreams by name and milestones by title; ids live in
// frontmatter. Notes never see this folder: loadNotes reads only the vault's top level.
export { loadOpus } from "./opusLoad.js";
export { saveProject, saveTask, saveDecision, saveQuestion, deleteItem, moveTask } from "./opusVault.js";
export { watchOpus } from "./opusWatch.js";
export { getOpusMeta, resetOpusState, OPUS_DIR, INBOX_DIR } from "./opusFs.js";
export { contextOf } from "./projectFile.js";
export * as projectFile from "./projectFile.js";
export * as taskFile from "./taskFile.js";
export * as decisionFile from "./decisionFile.js";
export * as questionFile from "./questionFile.js";
export { projectFolderName, taskFileName, decisionFileName, questionFileName } from "./names.js";
