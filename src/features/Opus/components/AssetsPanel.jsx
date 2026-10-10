import React, { useRef, useState } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { useData } from "../../../context/DataContext";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { Button } from "@/components/arc/button/button";
import { Alert } from "@/components/arc/alert/alert";
import AssetTile, { PendingTile } from "./library/AssetTile";
import AssetPreviewDialog from "./library/AssetPreviewDialog";
import { useAssetSrc } from "./library/useAssetSrc";
import { useAssetUploads } from "./library/useAssetUploads";
import { openPdf } from "./library/assetActions";
import { ASSET_ERRORS, isPdfType } from "./library/assetRules";
import styles from "./library/AssetsPanel.module.css";

/**
 * Project files with a drop target and a thumbnail grid. Storage (disk in
 * Tauri with a vault, base64 on the web) lives in useAssetUploads.
 */
export default function AssetsPanel({ project }) {
  const { updateProject } = useData();
  const srcFor = useAssetSrc();
  const { pending, errors, addFiles, removeAsset, dismissError, reportError } = useAssetUploads({ project, updateProject });
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const fileInputRef = useRef(null);

  const assets = project.assets ?? [];
  const isEmpty = assets.length === 0 && pending.length === 0;
  const browse = () => fileInputRef.current?.click();

  const openAsset = (asset) => {
    if (!isPdfType(asset.type)) {
      setPreviewAsset(asset);
      return;
    }
    try {
      openPdf(asset, srcFor);
    } catch (e) {
      console.error("[MAIA] Couldn't open PDF", e);
      reportError(asset.name, ASSET_ERRORS.open(asset.name));
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(event.dataTransfer.files);
  };
  // Leaving for a child element also fires dragleave; only a real exit clears the highlight.
  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragOver(false);
  };

  const addButton = (
    <Button variant="secondary" size="sm" onClick={browse}>
      <Upload size={16} strokeWidth={1.75} aria-hidden="true" />
      Add files
    </Button>
  );

  return (
    <SectionCard
      icon={FolderOpen}
      title="Assets"
      titleAs="h2"
      count={assets.length}
      action={!isEmpty && addButton}
      className={styles.card}
      bodyClassName={styles.body}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        aria-label="Add files to this project"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {errors.length > 0 && (
        <div className={styles.errors}>
          {errors.map((error) => (
            <Alert key={error.id} tone="danger" title={`Couldn't add ${error.name}`} onDismiss={() => dismissError(error.id)}>
              {error.message}
            </Alert>
          ))}
        </div>
      )}

      <div
        className={styles.zone}
        data-dragging={isDragOver || undefined}
        data-empty={isEmpty || undefined}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isEmpty ? (
          <EmptyState
            icon={Upload}
            title="No assets yet"
            description="Drop files here to keep specs, mockups and PDFs with this project."
            action={addButton}
          />
        ) : (
          <ul className={styles.grid} aria-busy={pending.length > 0 || undefined}>
            {assets.map((asset) => (
              <AssetTile key={asset.id} asset={asset} src={srcFor(asset)} onOpen={openAsset} onDelete={setDeletingAsset} />
            ))}
            {pending.map((item) => <PendingTile key={item.id} name={item.name} />)}
          </ul>
        )}
      </div>

      <AssetPreviewDialog asset={previewAsset} src={previewAsset ? srcFor(previewAsset) : null} onClose={() => setPreviewAsset(null)} />

      <ConfirmDialog
        open={Boolean(deletingAsset)}
        onClose={() => setDeletingAsset(null)}
        title={`Delete ${deletingAsset?.name ?? "file"}?`}
        description={
          deletingAsset?.path
            ? "The file is removed from this project and deleted from your vault folder. This can't be undone."
            : "The file is removed from this project. This can't be undone."
        }
        confirmLabel="Delete file"
        onConfirm={() => removeAsset(deletingAsset)}
      />
    </SectionCard>
  );
}
