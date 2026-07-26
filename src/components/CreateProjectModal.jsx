import React, { useState, useEffect } from "react";
import ProjectIcon, { IconPicker } from "./ProjectIcon";
import { AppDialog } from "@/components/composed/AppDialog";
import { Field } from "@/components/composed/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("terminal");
    const [iconColor, setIconColor] = useState("white");
    const [showPicker, setShowPicker] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setIcon("terminal");
            setIconColor("white");
            setShowPicker(false);
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        // This used to `return` silently on an empty name, so the Create button
        // simply did nothing and never said why.
        if (!name.trim()) {
            setError("Give the project a name.");
            return;
        }
        onCreate({ name: name.trim(), icon, iconColor });
        onClose();
    };

    return (
        <>
            <AppDialog
                open={isOpen}
                onClose={onClose}
                size="sm"
                title="New project"
                contentClassName="overflow-visible"
                footer={
                    <>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit}>Create</Button>
                    </>
                }
            >
                {/* The icon button sits inside Field's control slot so it stays
                    aligned with the input regardless of whether an error message
                    is showing. */}
                <form onSubmit={handleSubmit}>
                    <Field label="Name" error={error} required htmlFor="new-project-name">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPicker(true)}
                                aria-label="Choose project icon"
                                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-overlay-subtle text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                                <ProjectIcon name={icon} size={18} color={iconColor} />
                            </button>
                            <Input
                                id="new-project-name"
                                autoFocus
                                value={name}
                                placeholder="Project name…"
                                aria-invalid={error ? true : undefined}
                                aria-describedby={error ? "new-project-name-error" : undefined}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (error) setError(null);
                                }}
                            />
                        </div>
                    </Field>
                </form>
            </AppDialog>

            {/* Sibling rather than nested: the picker is its own overlay, and
                rendering it inside the dialog's tree trapped it there. */}
            {isOpen && showPicker && (
                <IconPicker
                    currentIcon={icon}
                    currentColor={iconColor}
                    onSelect={(newIcon, newColor) => {
                        setIcon(newIcon);
                        setIconColor(newColor);
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </>
    );
}
