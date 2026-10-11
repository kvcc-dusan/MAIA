import React, { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/arc/button/button";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import { EmptyState } from "@/components/composed/EmptyState";
import { ErrorState } from "@/components/composed/ErrorState";
import { toDayString } from "../lib/metrics";
import { showOwners } from "../lib/people";
import { WORKSTREAM_COLORS } from "../lib/projectModel";
import { useOpusNav } from "../OpusNavContext";
import { buildHubOverview } from "../components/overview/hubOverview";
import ProjectHeader from "../components/overview/ProjectHeader";
import EditProjectPanel from "../components/overview/EditProjectPanel";
import AddWorkstreamPanel from "../components/overview/AddWorkstreamPanel";
import StatTiles from "../components/overview/StatTiles";
import BurnupCard from "../components/overview/BurnupCard";
import StatusMixCard from "../components/overview/StatusMixCard";
import WorkstreamsCard from "../components/overview/WorkstreamsCard";
import AttentionCard from "../components/overview/AttentionCard";
import ActivityCard from "../components/overview/ActivityCard";
import styles from "./OverviewTab.module.css";

// A throw in the metrics (corrupt stored data) becomes an error state, not a blank tab.
const safeBuild = (input) => {
  try {
    return { overview: buildHubOverview(input) };
  } catch (error) {
    console.error("Overview could not be built", error);
    return { error };
  }
};

/** The hub's Overview: header, four tiles, burn-up, status mix, workstreams, attention, activity. */
export default function OverviewTab({ project }) {
  const { tasks, activity, updateProject, addWorkstream } = useData();
  const { navigate } = useOpusNav();
  const [attempt, setAttempt] = useState(0);
  const [panel, setPanel] = useState(null); // "edit" | "workstream" | null
  const today = toDayString(new Date());
  const ready = Array.isArray(tasks) && Array.isArray(activity);

  const projectTasks = useMemo(
    () => (ready ? tasks.filter((t) => t.projectId === project.id) : []),
    [ready, tasks, project.id],
  );
  const result = useMemo(
    () => (ready ? safeBuild({ project, tasks: projectTasks, activity, today, now: new Date() }) : null),
    // `attempt` re-runs a failed build when the person presses retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, project, projectTasks, activity, today, attempt],
  );

  if (!result) return <Skeleton label="Loading overview" lines={5} />;
  if (result.error) {
    return (
      <ErrorState
        title="The overview could not be built"
        message={`${result.error.message}. Check the project's tasks and dates, then try again.`}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  const { overview } = result;
  const closePanel = () => setPanel(null);
  const nextColor = WORKSTREAM_COLORS[project.workstreams.length % WORKSTREAM_COLORS.length];

  return (
    <div className={styles.root}>
      <ProjectHeader project={project} overview={overview} onEdit={() => setPanel("edit")} />
      {overview.isEmpty ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add the first task to start tracking progress, pace and what needs attention."
          action={<Button onClick={() => navigate("tasks")}>Add a task</Button>}
        />
      ) : (
        <>
          <h2 className={styles.srOnly}>Key numbers</h2>
          <StatTiles overview={overview} navigate={navigate} />
          <div className={`${styles.row} ${styles.burn}`}>
            <BurnupCard overview={overview} />
            <StatusMixCard mix={overview.mix} />
          </div>
        </>
      )}
      <WorkstreamsCard progress={overview.progress} navigate={navigate} onAdd={() => setPanel("workstream")} />
      {overview.isEmpty ? null : (
        <div className={`${styles.row} ${styles.split}`}>
          <AttentionCard
            attention={overview.attention}
            workstreams={project.workstreams}
            showOwners={showOwners(project, projectTasks)}
            navigate={navigate}
          />
          <ActivityCard heat={overview.heat} navigate={navigate} />
        </div>
      )}
      {panel === "edit" ? (
        <EditProjectPanel
          open
          project={project}
          onClose={closePanel}
          onSave={(patch) => { updateProject(project.id, patch); closePanel(); }}
        />
      ) : null}
      {panel === "workstream" ? (
        <AddWorkstreamPanel
          open
          defaultColor={nextColor}
          onClose={closePanel}
          onSave={(data) => { addWorkstream(project.id, data); closePanel(); }}
        />
      ) : null}
    </div>
  );
}
