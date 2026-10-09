import React, { useState, useEffect } from "react";
import ProjectIcon from "./ProjectIcon";
import IconPicker from "./projectIcon/IconPicker";
import { AppDialog } from "@/components/composed/AppDialog";
import { SectionLabel } from "@/components/composed/SectionBits";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import styles from "./CreateProjectModal.module.css";

const FORM_ID = "create-project-form";
const DEFAULT_ICON = "terminal";
const DEFAULT_COLOR = "white";

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState("");
    const [icon, setIcon] = useState(DEFAULT_ICON);
    const [iconColor, setIconColor] = useState(DEFAULT_COLOR);
    const [showPicker, setShowPicker] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setIcon(DEFAULT_ICON);
            setIconColor(DEFAULT_COLOR);
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
                footer={
                    <>
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" form={FORM_ID}>Create project</Button>
                    </>
                }
            >
                <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
                    <Input
                        label="Name"
                        autoFocus
                        value={name}
                        placeholder="Project name"
                        error={error ?? undefined}
                        aria-required="true"
                        onChange={(e) => {
                            setName(e.target.value);
                            if (error) setError(null);
                        }}
                    />

                    <div className={styles.iconRow}>
                        <SectionLabel>Icon</SectionLabel>
                        <Button type="button" variant="secondary" onClick={() => setShowPicker(true)}>
                            <ProjectIcon name={icon} size={18} color={iconColor} />
                            Choose icon
                        </Button>
                    </div>
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
