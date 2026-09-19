import React, { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";
import { AppDialog } from "@/components/composed/AppDialog";
import { useData } from "../../../context/DataContext";
import { UploadSquare01 as Upload, CancelSquare as X, File01 as FileIcon, Folder01 as Folder, Link04 as ExternalLink } from "../../../components/ui/CustomIcon.jsx";
import { uid } from "../../../lib/ids";
import { isTauri, getVaultPath } from "../../../lib/vault.js";
import { saveAssetFile, deleteAssetFile } from "../../../lib/assetStore.js";
import { SectionCard } from "../../../components/composed/SectionCard";

// Total base64 budget per project in the web/localStorage fallback path —
// the per-file 5MB cap alone doesn't stop many-small-files quota exhaustion,
// since all projects share the one `maia.projects` localStorage key.
const MAX_WEB_ASSETS_BASE64_BYTES = 20 * 1024 * 1024;

/** Resolves a displayable src for an asset: disk-backed (new) or base64 (legacy/web). */
const assetSrc = (asset, convertFileSrc) => {
    if (asset.path) return convertFileSrc(asset.path);
    return asset.dataUrl;
};

/**
 * AssetsPanel — Layer 3B
 * Lightweight drag-and-drop project assets with thumbnail grid.
 * In Tauri (with a vault picked), files are written to disk under
 * `<vault>/.maia-assets/<projectId>/` instead of base64-encoded into
 * localStorage. Web/PWA (no filesystem) keeps the original dataUrl behavior.
 */
export default function AssetsPanel({ project }) {
    const { updateProject } = useData();
    const [isDragOver, setIsDragOver] = useState(false);
    const [previewAsset, setPreviewAsset] = useState(null);
    const [convertFileSrcFn, setConvertFileSrcFn] = useState(null);
    const fileInputRef = useRef(null);

    // convertFileSrc lives in @tauri-apps/api/core — dynamically imported so
    // the web bundle never pulls in Tauri code, consistent with vault.js.
    useEffect(() => {
        if (!isTauri()) return;
        let cancelled = false;
        import("@tauri-apps/api/core").then(({ convertFileSrc }) => {
            if (!cancelled) setConvertFileSrcFn(() => convertFileSrc);
        });
        return () => { cancelled = true; };
    }, []);

    const assets = project.assets || [];

    const handleFiles = (fileList) => {
        const files = Array.from(fileList);
        const vaultPath = isTauri() ? getVaultPath() : null;

        files.forEach(async (file) => {
            // Limit size (~5MB for localStorage)
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`"${file.name}" is too large — 5MB max.`);
                return;
            }

            if (vaultPath) {
                try {
                    const buffer = await file.arrayBuffer();
                    const id = uid();
                    const path = await saveAssetFile(vaultPath, project.id, id, file.name, buffer);
                    const newAsset = {
                        id,
                        name: file.name,
                        type: file.type,
                        path,
                        createdAt: new Date().toISOString(),
                    };
                    updateProject(project.id, {
                        assets: [...(project.assets || []), newAsset]
                    });
                } catch (e) {
                    console.error(`[MAIA] Failed to save asset "${file.name}" to disk`, e);
                    toast.error(`Couldn't save "${file.name}".`);
                }
                return;
            }

            const currentTotal = (project.assets || []).reduce(
                (sum, a) => sum + (a.dataUrl?.length || 0), 0
            );
            if (currentTotal > MAX_WEB_ASSETS_BASE64_BYTES) {
                toast.error(`Project assets are full — remove some before adding "${file.name}".`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const newAsset = {
                    id: uid(),
                    name: file.name,
                    type: file.type,
                    dataUrl: e.target.result,
                    createdAt: new Date().toISOString(),
                };
                updateProject(project.id, {
                    assets: [...(project.assets || []), newAsset]
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAsset = (asset) => {
        if (asset.path && isTauri()) {
            deleteAssetFile(asset.path).catch(console.error);
        }
        updateProject(project.id, {
            assets: (project.assets || []).filter(a => a.id !== asset.id)
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const isImage = (type) => type && type.startsWith('image/');

    return (
        <SectionCard
            icon={Folder}
            title="Assets"
            count={assets.length}
            bodyClassName="flex-1 p-4 flex flex-col"
            action={
                <>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                        title="Upload files"
                    >
                        <Upload size={12} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                </>
            }
        >
            {/* Drop Zone / Grid */}
            <div
                className={`flex-1 rounded-xl border-2 border-dashed transition-all ${isDragOver
                    ? "border-success/40 bg-success/5"
                    : assets.length === 0
                        ? "border-border hover:border-border-strong cursor-pointer"
                        : "border-transparent"
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={assets.length === 0 ? () => fileInputRef.current?.click() : undefined}
            >
                {assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-faint-foreground">
                        <Upload size={18} className="opacity-40" />
                        <p className="text-xs italic">Drop files or click to browse</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 p-1">
                        {assets.map(asset => (
                            <div
                                key={asset.id}
                                className="relative group aspect-square rounded-lg overflow-hidden border border-border-subtle hover:border-border-strong transition-all cursor-pointer"
                                onClick={() => {
                                    if (asset.type === 'application/pdf') {
                                        if (asset.path) {
                                            // Disk-backed asset — the asset: protocol serves any file type directly.
                                            if (convertFileSrcFn) window.open(convertFileSrcFn(asset.path), '_blank');
                                            return;
                                        }
                                        // Legacy/web dataUrl asset — decode base64 into a Blob to open it.
                                        const byteString = atob(asset.dataUrl.split(',')[1]);
                                        const ab = new ArrayBuffer(byteString.length);
                                        const ia = new Uint8Array(ab);
                                        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                                        const blob = new Blob([ab], { type: 'application/pdf' });
                                        window.open(URL.createObjectURL(blob), '_blank');
                                    } else {
                                        setPreviewAsset(asset);
                                    }
                                }}
                            >
                                {isImage(asset.type) ? (
                                    <img
                                        src={assetSrc(asset, convertFileSrcFn)}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-overlay-subtle p-2">
                                        <FileIcon size={20} className="text-subtle-foreground mb-1" />
                                        <span className="text-xs text-muted-foreground truncate w-full text-center">{asset.name}</span>
                                        {asset.type === 'application/pdf' && (
                                            <ExternalLink size={10} className="text-subtle-foreground mt-1" />
                                        )}
                                    </div>
                                )}

                                {/* Remove button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeAsset(asset); }}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AppDialog
                open={!!previewAsset}
                onClose={() => setPreviewAsset(null)}
                size="xl"
                title={previewAsset?.name}
            >
                {previewAsset && (isImage(previewAsset.type) ? (
                    <img
                        src={assetSrc(previewAsset, convertFileSrcFn)}
                        alt={previewAsset.name}
                        className="mx-auto max-h-[70vh] max-w-full rounded-xl"
                    />
                ) : (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                        <FileIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-foreground">{previewAsset.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{previewAsset.type}</p>
                    </div>
                ))}
            </AppDialog>
        </SectionCard>
    );
}
