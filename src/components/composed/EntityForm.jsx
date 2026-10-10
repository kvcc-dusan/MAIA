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
 *
 * `inPanel` drops the heading and the outer padding for forms that live in a
 * SidePanel, which supplies both.
 */
function EntityForm({ title, onCancel, onSubmit, submitLabel, children, inPanel = false }) {
  return (
    <div className={`${styles.scroller} custom-scrollbar`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={inPanel ? `${styles.form} ${styles.inPanel}` : styles.form}
      >
        {/* Inside a SidePanel the panel already shows the title and pads the body. */}
        {inPanel ? null : <h2 className={styles.title}>{title}</h2>}

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
