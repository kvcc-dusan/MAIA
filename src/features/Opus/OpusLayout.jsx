import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/arc/tabs/tabs";
import { useData } from "../../context/DataContext";
import ProjectIdentity from "./components/ProjectIdentity";
import WeeklyReportDialog from "./components/WeeklyReportDialog";
import { OpusNavProvider, useOpusNav } from "./OpusNavContext";
import OverviewTab from "./tabs/OverviewTab";
import BoardTab from "./tabs/BoardTab";
import TasksTab from "./tabs/TasksTab";
import RoadmapTab from "./tabs/RoadmapTab";
import RecordTab from "./tabs/RecordTab";
import LibraryTab from "./tabs/LibraryTab";
import styles from "./OpusLayout.module.css";

const TAB_STORAGE_KEY = "maia.opus.tab";

// Order here is the order on screen. Each Panel receives { project, selectNote }.
const TABS = [
  { id: "overview", label: "Overview", Panel: OverviewTab },
  { id: "board", label: "Board", Panel: BoardTab },
  { id: "tasks", label: "Tasks", Panel: TasksTab },
  { id: "roadmap", label: "Roadmap", Panel: RoadmapTab },
  { id: "record", label: "Record", Panel: RecordTab },
  { id: "library", label: "Library", Panel: LibraryTab },
];
const TAB_IDS = TABS.map((t) => t.id);
const DEFAULT_TAB = TAB_IDS[0];

// Storage can be blocked or hold a tab id from another version, so both
// directions swallow errors and the read validates against the current ids.
const readSavedTab = () => {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return TAB_IDS.includes(saved) ? saved : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
};

const saveTab = (tab) => {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // storage blocked: the choice lasts for this session only
  }
};

function OpusPage({ project, updateProject, selectNote }) {
  const { tab, navigate } = useOpusNav();
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <ProjectIdentity project={project} updateProject={updateProject} />
        <Button variant="secondary" onClick={() => setIsReportOpen(true)}>Weekly report</Button>
      </header>

      <Tabs value={tab} onValueChange={(next) => navigate(next)} className={styles.tabs}>
        <TabsList aria-label="Project sections">
          {TABS.map(({ id, label }) => (
            <TabsTrigger key={id} value={id}>{label}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((entry) => {
          // Not destructured in the parameter: the lint config only recognises
          // JSX usage of capitalised variables, not of arguments.
          const Panel = entry.Panel;
          return (
            <TabsContent key={entry.id} value={entry.id}>
              <Panel project={project} selectNote={selectNote} />
            </TabsContent>
          );
        })}
      </Tabs>

      <WeeklyReportDialog
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        project={project}
        selectNote={selectNote}
      />
    </div>
  );
}

/**
 * OPUS: the project command center. A header (name, meta line, weekly report)
 * above Arc tabs. The selected tab lives in OpusNavContext so any panel can
 * link to another with a filter applied; it is remembered across visits.
 */
export default function OpusLayout({ projectId, selectNote }) {
  const { projects, updateProject } = useData();
  // Read once: the provider only uses it as its starting tab.
  const [initialTab] = useState(readSavedTab);

  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  return (
    <OpusNavProvider tabs={TAB_IDS} initialTab={initialTab} onTabChange={saveTab}>
      <OpusPage project={project} updateProject={updateProject} selectNote={selectNote} />
    </OpusNavProvider>
  );
}
