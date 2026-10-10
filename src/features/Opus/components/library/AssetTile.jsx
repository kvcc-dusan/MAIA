import React, { useState } from "react";
import { File, FileText, Trash2 } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import { isImageType, isPdfType } from "./assetRules";
import styles from "./AssetTile.module.css";

/** Placeholder while a file is being read or written. */
export function PendingTile({ name }) {
  return (
    <li className={styles.tile} aria-busy="true">
      <div className={styles.pending}>
        <Skeleton label={`Adding ${name}`} lines={2} />
      </div>
      <span className={styles.caption}>{name}</span>
    </li>
  );
}

/** One stored file: the thumbnail opens it, the trash button asks to delete it. */
export default function AssetTile({ asset, src, onOpen, onDelete }) {
  const [broken, setBroken] = useState(false);
  const showImage = isImageType(asset.type) && src && !broken;
  const isPdf = isPdfType(asset.type);
  const Icon = isPdf ? FileText : File;
  // Only web (base64) PDFs open in a tab; files in the vault open the preview card.
  const hint = isPdf && !asset.path ? "opens in a new tab" : "preview";

  return (
    <li className={styles.tile}>
      <button type="button" className={styles.open} onClick={() => onOpen(asset)} aria-label={`${asset.name}, ${hint}`}>
        <span className={styles.thumb}>
          {showImage ? (
            <img src={src} alt="" loading="lazy" className={styles.image} onError={() => setBroken(true)} />
          ) : (
            <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
          )}
        </span>
        <span className={styles.caption}>{asset.name}</span>
      </button>
      <IconButton
        icon={Trash2}
        label={`Delete ${asset.name}`}
        tooltip={false}
        className={styles.remove}
        onClick={() => onDelete(asset)}
      />
    </li>
  );
}
