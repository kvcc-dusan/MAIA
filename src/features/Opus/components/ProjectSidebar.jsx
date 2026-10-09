import React from "react";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import ProjectList from "./ProjectList";
import styles from "./ProjectSidebar.module.css";

/**
 * The desktop project switcher: a 280px column, or a 52px icon rail when
 * collapsed. Hidden when the page is narrower than 800px, where it opens the same list in a drawer.
 */
export default function ProjectSidebar({ isCollapsed, onToggleCollapse, onCreate, ...listProps }) {
  return (
    <nav className={styles.sidebar} data-collapsed={isCollapsed || undefined} aria-label="Projects">
      <div className={styles.header}>
        {!isCollapsed && <h2 className={styles.title}>Projects</h2>}
        <IconButton icon={Plus} size="icon" label="New project" side="right" onClick={onCreate} />
      </div>

      <div className={styles.scroll}>
        <ProjectList isRail={isCollapsed} onCreate={onCreate} {...listProps} />
      </div>

      <div className={styles.footer}>
        <IconButton
          icon={isCollapsed ? PanelLeftOpen : PanelLeftClose}
          size="icon"
          label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="right"
          aria-expanded={!isCollapsed}
          onClick={onToggleCollapse}
        />
      </div>
    </nav>
  );
}
