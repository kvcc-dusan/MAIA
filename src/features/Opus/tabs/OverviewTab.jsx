import React, { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/arc/button/button";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import { EmptyState } from "@/components/composed/EmptyState";
import { ErrorState } from "@/components/composed/ErrorState";
import { toDayString } from "../lib/metrics";
import { useOpusNav } from "../OpusNavContext";
import ProjectBrief from "../components/ProjectBrief";
import MetricsRow from "../components/overview/MetricsRow";
import { ActivityPanel, BurnupPanel, StatusPanel } from "../components/overview/ChartPanels";
import WorkstreamsPanel from "../components/overview/WorkstreamsPanel";
import { AttentionPanel, MilestonesPanel } from "../components/overview/ListPanels";
import { buildOverviewModel } from "../components/overview/overviewModel";
import styles from "./OverviewTab.module.css";

// A throw in the metrics (corrupt stored data) becomes an error state, not a blank tab.
const safeBuild = (input) => {
  try {
    return { model: buildOverviewModel(input) };
  } catch (error) {
    console.error("Overview could not be built", error);
    return { error };
  }
};

/** The health dashboard: numbers, burn-up, status mix, workstreams, activity, then brief and details. */
export default function OverviewTab({ project }) {
  const { tasks, activity, updateProject } = useData();
  const { navigate } = useOpusNav();
  const [attempt, setAttempt] = useState(0);
  const today = toDayString(new Date());
  const ready = Array.isArray(tasks) && Array.isArray(activity);

  const projectTasks = useMemo(
    () => (ready ? tasks.filter((t) => t.projectId === project.id) : []),
    [ready, tasks, project.id],
  );
  const { id, startDate, targetDate, workstreams, milestones, questions } = project;
  const result = useMemo(
    () => (ready
      ? safeBuild({
        project: { id, startDate, targetDate, workstreams, milestones, questions },
        tasks: projectTasks,
        activity,
        today,
      })
      : null),
    // `attempt` re-runs a failed build when the person presses retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, id, startDate, targetDate, workstreams, milestones, questions, projectTasks, activity, today, attempt],
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

  const { model } = result;
  return (
    <div className={styles.root}>
      {model.isEmpty ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add the first task to start tracking progress, pace and what needs attention."
          action={<Button onClick={() => navigate("tasks")}>Add a task</Button>}
        />
      ) : (
        <>
          <h2 className={styles.srOnly}>Key numbers</h2>
          <MetricsRow cards={model.cards} navigate={navigate} />
          <div className={`${styles.row} ${styles.burn}`}>
            <BurnupPanel burnup={model.burnup} />
            <StatusPanel mix={model.mix} navigate={navigate} />
          </div>
        </>
      )}
      <WorkstreamsPanel progress={model.progress} navigate={navigate} />
      {!model.isEmpty && <ActivityPanel heat={model.heat} navigate={navigate} />}
      <div className={`${styles.row} ${styles.split}`}>
        <MilestonesPanel milestones={model.milestones} today={today} navigate={navigate} />
        {!model.isEmpty && <AttentionPanel attention={model.attention} today={today} navigate={navigate} />}
      </div>
      <div className={`${styles.row} ${styles.split}`}>
        <ProjectBrief project={project} updateProject={updateProject} />
      </div>
    </div>
  );
}
