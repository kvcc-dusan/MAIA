import React from "react";
import { Plus } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import ProjectList from "./ProjectList";
import styles from "./ProjectSidebar.module.css";

/**
 * The project switcher, rendered into the shell's secondary sidebar. The shell
 * owns its width and whether it is open.
 */
export default function ProjectSidebar({ onCreate, ...listProps }) {
  return (
    <nav className={styles.sidebar} aria-label="Projects">
      <div className={styles.header}>
        <h2 className={styles.title}>Projects</h2>
        <IconButton icon={Plus} size="icon" label="New project" side="bottom" onClick={onCreate} />
      </div>

      <div className={styles.scroll}>
        <ProjectList onCreate={onCreate} {...listProps} />
      </div>
    </nav>
  );
}
