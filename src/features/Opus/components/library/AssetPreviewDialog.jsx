import React, { useState } from "react";
import { Download, File } from "lucide-react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { Alert } from "@/components/arc/alert/alert";
import { ASSET_ERRORS, formatBytes, isImageType } from "./assetRules";
import { downloadAsset } from "./assetActions";
import styles from "./AssetPreviewDialog.module.css";

/** Image preview, or a file card (name, type, size) for everything else. Both can be downloaded. */
export default function AssetPreviewDialog({ asset, src, readBytes, onClose }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await downloadAsset(asset, readBytes);
    } catch (e) {
      console.error("[MAIA] Asset download failed", e);
      setError(ASSET_ERRORS.download(asset.name));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <AppDialog
      open={Boolean(asset)}
      onClose={handleClose}
      size="xl"
      title={asset?.name ?? "Asset"}
      footer={
        asset && (
          <Button variant="secondary" loading={isSaving} onClick={save}>
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            Download file
          </Button>
        )
      }
    >
      {error && <Alert tone="danger" title="Download failed">{error}</Alert>}
      {asset && (isImageType(asset.type) && src ? (
        <img src={src} alt={asset.name} className={styles.image} />
      ) : (
        <div className={styles.file}>
          <File size={32} strokeWidth={1.75} aria-hidden="true" />
          <p className={styles.name}>{asset.name}</p>
          <p className={styles.type}>
            {[asset.type || "Unknown file type", asset.size != null && formatBytes(asset.size)].filter(Boolean).join(", ")}
          </p>
        </div>
      ))}
    </AppDialog>
  );
}
