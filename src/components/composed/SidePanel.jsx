import * as React from "react";
import { AppDialog } from "./AppDialog";

/**
 * Form and detail surface for Opus (edit project, task, milestone, document...).
 * It used to slide in from the right; Dušan wanted a centred modal, so this is now a
 * thin wrapper over AppDialog. The name and props stay so call sites keep working.
 * `side` is accepted and ignored.
 */
// eslint-disable-next-line no-unused-vars
function SidePanel({ side, size = "md", ...props }) {
  return <AppDialog size={size} {...props} />;
}

export { SidePanel };
