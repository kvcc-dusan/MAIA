{/* Delete Confirmation Modal */ }
{
    showDeleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-white mb-2">Delete All Notes?</h3>
                <p className="text-sm text-zinc-400 mb-6">
                    This action cannot be undone. All {notes.length} notes will be permanently removed.
                </p>
                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDeleteAll}
                        className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
                    >
                        Delete All
                    </button>
                </div>
            </div>
        </div>
    )
}
