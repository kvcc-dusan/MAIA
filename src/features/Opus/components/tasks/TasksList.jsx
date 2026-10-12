import React from "react";
import { GroupCard } from "../../kit";
import TaskRow from "./TaskRow";
import styles from "./TasksList.module.css";

const metaOf = (group) => `${group.done} of ${group.total} done`;

/** One GroupCard per group. Rows hide the name the group already shows. */
export default function TasksList({ groups, groupBy, ctx, workstreamsById, milestonesById }) {
  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <GroupCard
          key={group.key}
          title={group.label}
          color={group.color ?? undefined}
          meta={metaOf(group)}
          progress={{ value: group.done, max: Math.max(group.total, 1) }}
        >
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              ctx={ctx}
              workstream={groupBy === "workstream" ? null : workstreamsById.get(task.workstreamId)}
              milestone={groupBy === "milestone" ? null : milestonesById.get(task.milestoneId)}
            />
          ))}
        </GroupCard>
      ))}
    </div>
  );
}
