import React, { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/arc/tabs/tabs";
import { useData } from "../../context/DataContext";
import ProjectIdentity from "./components/ProjectIdentity";
import EditProjectPanel from "./components/overview/EditProjectPanel";
import { OpusNavProvider, useOpusNav } from "./OpusNavContext";
import OverviewTab from "./tabs/OverviewTab";
import BoardTab from "./tabs/BoardTab";
import TasksTab from "./tabs/TasksTab";
import RoadmapTab from "./tabs/RoadmapTab";
import DecisionsTab from "./tabs/DecisionsTab";
import QuestionsTab from "./tabs/QuestionsTab";
import DocumentsTab from "./tabs/DocumentsTab";
import NotesTab from "./tabs/NotesTab";
import ReportTab from "./tabs/ReportTab";
import ResourcesTab from "./tabs/ResourcesTab";
import styles from "./OpusLayout.module.css";

const TAB_STORAGE_KEY = "maia.opus.tab";

// Order here is the order on screen, named as in the project hub. Each Panel
// receives { project, selectNote }.
const TABS = [
  { id: "overview", label: "Overview", Panel: OverviewTab },
  { id: "board", label: "Board", Panel: BoardTab },
  { id: "tasks", label: "Tasks", Panel: TasksTab },
  { id: "roadmap", label: "Roadmap", Panel: RoadmapTab },
  { id: "decisions", label: "Decisions", Panel: DecisionsTab },
  { id: "questions", label: "Questions", Panel: QuestionsTab },
  { id: "documents", label: "Documents", Panel: DocumentsTab },
  { id: "notes", label: "Notes", Panel: NotesTab },
  { id: "report", label: "Weekly report", Panel: ReportTab },
  { id: "resources", label: "Resources", Panel: ResourcesTab },
];
const TAB_IDS = TABS.map((t) => t.id);
const DEFAULT_TAB = TAB_IDS[0];

// Tabs that were folded into others when the hub pages arrived.
const LEGACY_TABS = { record: "decisions", library: "resources", core: "resources" };

// Storage can be blocked or hold a tab id from another version, so both
// directions swallow errors and the read validates against the current ids.
const readSavedTab = () => {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    const resolved = LEGACY_TABS[saved] ?? saved;
    return TAB_IDS.includes(resolved) ? resolved : DEFAULT_TAB;
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
  const pageRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  // On a narrow window the remembered tab can start out of view in the scrolling tab strip; Arc only reveals a tab it was asked to switch to.
  useEffect(() => {
    pageRef.current?.querySelector('[role="tab"][aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <div ref={pageRef} className={styles.page}>
      <header className={styles.header}>
        <ProjectIdentity project={project} updateProject={updateProject} onEdit={() => setIsEditing(true)} />
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
      {isEditing ? (
        <EditProjectPanel
          open
          project={project}
          onClose={() => setIsEditing(false)}
          onSave={(patch) => { updateProject(project.id, patch); setIsEditing(false); }}
        />
      ) : null}
    </div>
  );
}

/**
 * OPUS: the project command center. A header (phase, name, headline)
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
