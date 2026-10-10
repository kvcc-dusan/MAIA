import styles from "./SettingRow.module.css";

/**
 * The one row every setting uses: label and description on the left, the
 * control on the right. Stacks when the settings pane is narrow. `controlId`
 * ties the label to a plain control; a composite control labels itself.
 */
export const SettingRow = ({ label, description, controlId, children }) => {
  const descriptionId = controlId ? `${controlId}-description` : undefined;
  return (
    <div className={styles.row}>
      <div className={styles.copy}>
        {controlId ? (
          <label className={styles.label} htmlFor={controlId}>{label}</label>
        ) : (
          <span className={styles.label}>{label}</span>
        )}
        {description && <p id={descriptionId} className={styles.description}>{description}</p>}
      </div>
      {children && <div className={styles.control}>{children}</div>}
    </div>
  );
};

/** A titled run of rows inside a section. */
export const SettingGroup = ({ title, children }) => (
  <section className={styles.group} aria-label={title}>
    {title && <h4 className={styles.groupTitle}>{title}</h4>}
    <div className={styles.rows}>{children}</div>
  </section>
);
