import React, { useState, useRef } from 'react';
import { useData } from "../../../context/DataContext";
import { Upload, X, Eye, FileIcon, Image as ImageIcon, ExternalLink } from "lucide-react";
import { uid } from "../../../lib/ids";

/**
 * AssetsPanel — Layer 3B
 * Lightweight drag-and-drop project assets with thumbnail grid.
 */
export default function AssetsPanel({ project }) {
    const { updateProject } = useData();
    const [isDragOver, setIsDragOver] = useState(false);
    const [previewAsset, setPreviewAsset] = useState(null);
    const fileInputRef = useRef(null);

    const assets = project.assets || [];

    const handleFiles = (fileList) => {
        const files = Array.from(fileList);
        files.forEach(file => {
            // Limit size (~5MB for localStorage)
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" is too large. Max 5MB.`);
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

    const removeAsset = (assetId) => {
        updateProject(project.id, {
            assets: (project.assets || []).filter(a => a.id !== assetId)
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const isImage = (type) => type && type.startsWith('image/');

    return (
        <div className="flex flex-col min-h-[200px] rounded-2xl bg-black border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-fluid-2xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                    <ImageIcon size={14} className="text-zinc-600" />
                    Assets
                </h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-fluid-3xs p-1 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-white"
                >
                    <Upload size={14} />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {/* Drop Zone / Grid */}
            <div
                className={`flex-1 rounded-xl border-2 border-dashed transition-all ${isDragOver
                    ? "border-[#93FD23]/40 bg-[#93FD23]/5"
                    : assets.length === 0
                        ? "border-white/10 hover:border-white/20"
                        : "border-transparent"
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                {assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-700">
                        <Upload size={20} className="mb-2 opacity-50" />
                        <p className="text-xs italic">Drop files here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 p-1">
                        {assets.map(asset => (
                            <div
                                key={asset.id}
                                className="relative group aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                                onClick={() => {
                                    if (asset.type === 'application/pdf') {
                                        // Open PDF in new tab
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
                                        src={asset.dataUrl}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-2">
                                        <FileIcon size={20} className="text-zinc-600 mb-1" />
                                        <span className="text-[8px] text-zinc-500 truncate w-full text-center">{asset.name}</span>
                                        {asset.type === 'application/pdf' && (
                                            <ExternalLink size={10} className="text-zinc-600 mt-1" />
                                        )}
                                    </div>
                                )}

                                {/* Remove button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-zinc-400 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewAsset && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center" onClick={() => setPreviewAsset(null)}>
                        <div className="max-w-[80vw] max-h-[80vh] relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setPreviewAsset(null)}
                                className="absolute -top-10 right-0 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            {isImage(previewAsset.type) ? (
                                <img src={previewAsset.dataUrl} alt={previewAsset.name} className="max-w-full max-h-[80vh] rounded-xl" />
                            ) : (
                                <div className="bg-zinc-900 border border-white/10 rounded-xl p-8 text-center">
                                    <FileIcon size={48} className="text-zinc-500 mx-auto mb-4" />
                                    <p className="text-white text-sm">{previewAsset.name}</p>
                                    <p className="text-zinc-500 text-xs mt-1">{previewAsset.type}</p>
                                </div>
                            )}
                            <div className="text-center mt-3 text-zinc-500 text-xs">{previewAsset.name}</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
