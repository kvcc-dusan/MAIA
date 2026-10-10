// @maia:opusFiles - folder and file names for the Opus tree (pure, no IO).
// Readable names (case and spaces kept) because people browse these in
// Obsidian; collisions are case-insensitive since macOS and Windows disks are.

export const MAX_NAME_LENGTH = 80;
const MAX_QUESTION_NAME = 60;
const SUFFIX_LIMIT = 1000;

// Illegal on macOS/Windows, plus # ^ [ ] which break Obsidian links.
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\u0000-\u001f\u007f/\\:*?"<>|#^[\]]+/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** A single path segment from free text. Empty string when nothing usable is left. */
export const cleanName = (text, max = MAX_NAME_LENGTH) => {
  let name = String(text ?? "")
    .normalize("NFC")
    .replace(ILLEGAL, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, max)
    .replace(/[\s.]+$/, "")
    .trim();
  if (WINDOWS_RESERVED.test(name)) name = `${name} item`;
  return name;
};

const lower = (s) => s.toLowerCase();

/**
 * First free name: "Base", "Base 2", "Base 3"... `taken` holds existing names
 * (with extension); comparison ignores case. The suffix counts toward the cap.
 */
export const uniqueName = (base, taken = [], ext = "") => {
  const used = new Set([...taken].map(lower));
  const fit = (suffix) => `${base.slice(0, MAX_NAME_LENGTH - suffix.length).replace(/\s+$/, "")}${suffix}${ext}`;
  let candidate = fit("");
  for (let n = 2; used.has(lower(candidate)) && n <= SUFFIX_LIMIT; n += 1) candidate = fit(` ${n}`);
  return candidate;
};

const fallbackBase = (kind, id) => `${kind} ${String(id ?? "").slice(0, 5) || "new"}`.trim();

// Folders the loader treats as non-projects must never be handed to a project.
const RESERVED_FOLDERS = ["_inbox", "_backups"];

export const projectFolderName = (project, takenFolders = []) =>
  uniqueName(cleanName(project?.name) || fallbackBase("Project", project?.id), [...takenFolders, ...RESERVED_FOLDERS]);

export const taskFileName = (task, takenFiles = []) =>
  uniqueName(cleanName(task?.title) || fallbackBase("Task", task?.id), takenFiles, ".md");

export const decisionFileName = (decision, takenFiles = []) =>
  uniqueName(cleanName(decision?.title) || fallbackBase("Decision", decision?.id), takenFiles, ".md");

// Questions are whole sentences: cut at a word boundary and drop the trailing "?".
export const shortenQuestion = (text) => {
  const clean = cleanName(String(text ?? "").replace(/\?+\s*$/, ""), 500);
  if (clean.length <= MAX_QUESTION_NAME) return clean;
  const cut = clean.slice(0, MAX_QUESTION_NAME);
  const lastSpace = cut.lastIndexOf(" ");
  return cleanName(lastSpace > MAX_QUESTION_NAME / 2 ? cut.slice(0, lastSpace) : cut);
};

export const questionFileName = (question, takenFiles = []) =>
  uniqueName(shortenQuestion(question?.question) || fallbackBase("Question", question?.id), takenFiles, ".md");
