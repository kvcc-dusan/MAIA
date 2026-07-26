import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * The one slide-over form shell inside Chronos.
 *
 * Task, signal and session forms each hand-copied the same wrapper — same
 * slide-in animation, same `p-8 flex flex-col gap-5`, same `h2 text-xl`
 * heading, same Cancel link, same white submit button. The fields genuinely
 * differ per entity (a session has start/end, a task has one deadline), so
 * this owns the chrome and each caller supplies only its fields as children.
 */
function EntityForm({ title, onCancel, onSubmit, submitLabel, children }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-1 flex-col gap-5 p-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:underline"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 space-y-5">{children}</div>

        <div className="flex justify-end pt-2">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </div>
  );
}

export { EntityForm };
