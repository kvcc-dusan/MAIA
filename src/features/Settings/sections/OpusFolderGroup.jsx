import { Alert } from "@/components/arc/alert/alert";
import { useData } from "@/context/DataContext.jsx";
import { SettingGroup, SettingRow } from "../SettingRow";
import styles from "./Sections.module.css";

const FIX_HINT = "Open the file in an editor, fix the front matter, MAIA reads it again automatically.";

/** Where Opus projects and tasks live in the vault, how many loaded, and which files could not be read. */
export const OpusFolderGroup = ({ vaultPath }) => {
  const { opusMeta } = useData();
  if (!vaultPath || opusMeta.mode !== "files") return null;
  const { status, warnings, projectCount, taskCount } = opusMeta;
  const unreadable = warnings.filter((w) => /not valid frontmatter|Could not read|has no project\.md/i.test(w.message));

  return (
    <>
      {unreadable.length > 0 && (
        <div className={styles.alert}>
          <Alert tone="danger" title={`${unreadable.length} Opus file${unreadable.length === 1 ? "" : "s"} could not be read`}>
            <p>{FIX_HINT}</p>
            <ul>
              {unreadable.map((w) => (
                <li key={`${w.path}:${w.message}`}>{w.path}: {w.message}</li>
              ))}
            </ul>
          </Alert>
        </div>
      )}
      <SettingGroup title="Opus">
        <SettingRow
          label="Opus folder"
          description={`${vaultPath.replace(/\/+$/, "")}/Opus`}
        />
        <SettingRow
          label="Loaded"
          description="Projects and tasks are Markdown files, one per item."
        >
          <span className={styles.value}>
            {status === "loading" ? "Loading" : `${projectCount} projects, ${taskCount} tasks`}
          </span>
        </SettingRow>
      </SettingGroup>
    </>
  );
};
