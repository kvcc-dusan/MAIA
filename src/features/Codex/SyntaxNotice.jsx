import React from "react";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";

const listReasons = (reasons) => {
  const labels = reasons.map((reason) => reason.label);
  return labels.length > 0 ? ` Found: ${labels.join(", ")}.` : "";
};

/**
 * Shown on a note the rich editor cannot save without changing it. In source mode it offers the
 * way out; in rich view (the user's own choice) it says what is at stake and offers the way back.
 */
export default function SyntaxNotice({ reasons = [], isSource, onSwitchView }) {
  const detail = listReasons(reasons);
  return (
    <div className="mb-4">
      <Alert
        tone="warning"
        title="This note uses syntax the editor can't keep intact yet"
      >
        {isSource
          ? `Edits are saved as plain markdown.${detail} Switch to the rich view at your own risk.`
          : `Editing here can change or drop that syntax when the note is saved.${detail}`}
        {" "}
        <Button variant="secondary" size="sm" onClick={onSwitchView}>
          {isSource ? "Switch to rich view" : "Back to source"}
        </Button>
      </Alert>
    </div>
  );
}
