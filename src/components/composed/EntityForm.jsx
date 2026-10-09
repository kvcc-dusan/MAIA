import * as React from "react";
import { Button } from "@/components/arc/button/button";
import styles from "./EntityForm.module.css";

/**
 * The one slide-over form shell inside Chronos.
 *
 * Task, signal and session forms each hand-copied the same wrapper, same
 * slide-in animation, same spacing, same heading, same submit button. The
 * fields genuinely differ per entity (a session has start/end, a task has one
 * deadline), so this owns the chrome and each caller supplies only its fields
 * as children (Field, Select, DateTimeField).
 *
 * Actions live in one footer row: Cancel (secondary) left of the primary
 * submit, the old top-corner Cancel link read as an exit, not an action, and
 * fought the dialog's close affordance for the corner.
 */
function EntityForm({ title, onCancel, onSubmit, submitLabel, children }) {
  return (
    <div className={`${styles.scroller} custom-scrollbar`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={styles.form}
      >
        <h2 className={styles.title}>{title}</h2>

        <div className={styles.fields}>{children}</div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </div>
  );
}

export { EntityForm };
