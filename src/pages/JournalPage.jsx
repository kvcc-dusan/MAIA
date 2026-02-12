import React, { useState, useMemo } from 'react';
import { uid, isoNow } from '../lib/ids.js';
import EditorRich from '../components/EditorRich.jsx';
import MarkdownDisplay from '../components/MarkdownDisplay.jsx';
import ProjectIcon from '../components/ProjectIcon';

const JournalHistoryList = React.memo(({ entries }) => {
    return (
        <div className='flex-1 relative min-h-0 w-full'>
            <div className='absolute inset-0 overflow-y-auto custom-scrollbar space-y-5 pb-8'>
                <div className='text-[10px] font-bold text-zinc-600 uppercase tracking-widest sticky top-0 z-10 py-2 mb-3 font-mono backdrop-blur-sm'>History</div>
                {entries.map(entry => (
                    <div key={entry.id} className='group relative pl-5 border-l border-white/10 hover:border-white/20 transition-colors'>
                        <div className='absolute -left-[3px] top-2 w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-white transition-colors' />
                        <div className='text-[10px] text-zinc-600 font-mono mb-1.5 flex justify-between uppercase tracking-wider'>
                            <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className='opacity-0 group-hover:opacity-100 transition-opacity'>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className='text-zinc-300 leading-relaxed text-sm font-mono'>
                            <MarkdownDisplay content={entry.content} />
                        </div>
                    </div>
                ))}
                {entries.length === 0 && (
                    <div className='text-center text-zinc-700 text-xs font-mono py-8 italic'>No entries yet.</div>
                )}
            </div>
        </div>
    );
});

export default function Journal({ journal = [], setJournal, onOpenLedger }) {

    const [content, setContent] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSubmit = () => {
        if (!content.trim()) return;
        setJournal([{ id: uid(), content, createdAt: isoNow() }, ...journal]);
        setContent('');
    };

    const filtered = useMemo(() =>
        searchQuery ? journal.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase())) : journal
        , [journal, searchQuery]);

    return (
        <div className='h-full w-full relative bg-black overflow-hidden flex flex-col items-center text-zinc-200'>

            <div className='w-full max-w-4xl h-full flex flex-col min-h-0 z-10 relative'>

                {/* Clean Dark Panel */}
                <div className='flex flex-col w-full h-full relative overflow-hidden bg-black/90 border border-white/10 rounded-2xl my-4 mx-auto shadow-2xl backdrop-blur-xl'>

                    {/* Header */}
                    <div className='flex-none px-6 py-5 border-b border-white/5 flex items-center justify-between z-20'>
                        <div className='flex flex-col gap-1'>
                            <div className='text-2xl md:text-3xl font-bold text-white tracking-tight'>
                                {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                            </div>
                            <div className='text-[10px] text-zinc-500 font-mono uppercase tracking-widest'>
                                Daily Log • {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
                            </div>
                        </div>

                        <div className='flex items-center gap-2'>
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className='w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all'
                                title="Search & Settings"
                                aria-label="Open Settings"
                            >
                                <ProjectIcon name='search' size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className='flex-1 flex flex-col h-full min-h-0 overflow-hidden relative px-6 pt-6 pb-0 gap-6'>

                        {/* Editor Input */}
                        <div className='flex-none flex flex-col max-h-[40vh] transition-all duration-300 ease-out'>
                            <div className='p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition-colors focus-within:border-white/15 flex flex-col overflow-hidden'>
                                <div className='flex-1 overflow-y-auto custom-scrollbar min-h-[80px]'>
                                    <EditorRich value={content} onChange={setContent} editable={true} placeholder='Start writing...' className='outline-none min-h-full' />
                                </div>
                                <div className='flex-none flex justify-end mt-2 pt-2 border-t border-white/5'>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!content.trim()}
                                        className='text-[10px] font-bold uppercase tracking-widest px-5 py-2 bg-white rounded-lg text-black hover:bg-zinc-200 transition-all font-mono disabled:opacity-30 disabled:cursor-not-allowed'
                                    >
                                        Capture
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* History Feed */}
                        <JournalHistoryList entries={filtered} />
                    </div>

                </div>
            </div>

            {/* Settings Drawer */}
            <div className={`absolute top-0 right-0 h-full w-72 z-50 transform transition-all duration-300 ease-out ${isDrawerOpen ? 'translate-x-0 visible' : 'translate-x-full invisible'}`}>
                <div className='h-full w-full bg-black/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl'>
                    <div className='flex items-center justify-between px-5 py-4 border-b border-white/5'>
                        <span className='text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono'>Search</span>
                        <button onClick={() => setIsDrawerOpen(false)} className='w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-all'>
                            <ProjectIcon name='x' size={14} />
                        </button>
                    </div>
                    <div className='p-4'>
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder='Search entries...'
                            className='w-full text-xs font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/20 transition-colors'
                        />
                    </div>
                </div>
            </div>

            {/* Backdrop */}
            {isDrawerOpen && <div onClick={() => setIsDrawerOpen(false)} className='absolute inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity' />}
        </div>
    );
}
