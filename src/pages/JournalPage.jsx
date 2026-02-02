import React, { useState, useMemo } from 'react';
import { uid, isoNow } from '../lib/ids.js';
import EditorRich from '../components/EditorRich.jsx';
import MarkdownDisplay from '../components/MarkdownDisplay.jsx';
import GlassSurface from '../components/GlassSurface.jsx';
import { GlassCard, GlassInput } from '../components/GlassCard';
import ProjectIcon from '../components/ProjectIcon';


export default function Journal({ journal = [], setJournal, onOpenLedger }) {


    // Journal State
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
        <div className='h-full w-full relative bg-black overflow-hidden flex flex-col items-center font-sans text-zinc-200'>
            {/* Background Watermark */}
            <div className='absolute bottom-[-1rem] left-[-0.5rem] text-[12rem] md:text-[16rem] leading-none font-bold text-white opacity-[0.34] select-none pointer-events-none z-0 tracking-tighter'>
                Journal
            </div>

            <div className='w-full max-w-4xl h-full p-4 md:p-8 flex flex-col min-h-0 z-10 relative'>
                <GlassSurface className='shadow-2xl relative flex flex-col h-full overflow-hidden'>

                    {/* Header & Tabs */}
                    <div className='flex-none px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-sm z-20'>
                        <div className="flex items-center gap-6">
                            <div>
                                <div className='text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1'>Daily Log</div>
                                <div className='text-3xl font-bold text-white tracking-tight'>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</div>
                            </div>


                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={onOpenLedger} className='p-2 text-zinc-500 hover:text-white transition-colors' title="Decision Ledger">
                                <ProjectIcon name='flag' size={24} />
                            </button>
                            <button onClick={() => setIsDrawerOpen(true)} className='p-2 text-zinc-500 hover:text-white transition-colors' title="Settings">
                                <ProjectIcon name='settings' size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className='flex-1 flex flex-col h-full min-h-0 overflow-hidden relative'>

                        {/* VIEW: ENTRIES */}
                        <div className='flex flex-col h-full px-6 pt-6 pb-0 md:px-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                            {/* Editor Area */}
                            <div className='flex-none flex flex-col max-h-[40vh] transition-all duration-300 ease-out'>
                                <div className='p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors focus-within:bg-white/10 flex flex-col overflow-hidden bg-black/20 backdrop-blur-md'>
                                    <div className='flex-1 overflow-y-auto custom-scrollbar min-h-[100px]'>
                                        <EditorRich value={content} onChange={setContent} editable={true} placeholder='Start writing...' className='outline-none min-h-full' />
                                    </div>
                                    <div className='flex-none flex justify-end mt-2 pt-2 border-t border-white/5 bg-transparent'>
                                        <button onClick={handleSubmit} disabled={!content.trim()} className='text-xs font-bold uppercase tracking-wider px-6 py-2 bg-white rounded-lg text-black hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:shadow-none'>Capture</button>
                                    </div>
                                </div>
                            </div>

                            {/* Feed */}
                            <div className='flex-1 relative min-h-0 w-full'>
                                <div className='absolute inset-0 overflow-y-auto custom-scrollbar space-y-6 pb-8'>
                                    <div className='text-xs font-bold text-zinc-600 uppercase tracking-widest sticky top-0 bg-transparent backdrop-blur-sm z-10 py-2 mb-4'>History</div>
                                    {filtered.map(entry => (
                                        <div key={entry.id} className='group relative pl-6 border-l border-white/10 hover:border-white/30 transition-colors'>
                                            <div className='absolute -left-[3px] top-2 w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-blue-500 transition-colors shadow-[0_0_8px_rgba(59,130,246,0.5)]' />
                                            <div className='text-xs text-zinc-500 font-mono mb-2 flex justify-between'>
                                                <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className='opacity-0 group-hover:opacity-100 transition-opacity'>{new Date(entry.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className='text-zinc-300 leading-relaxed opacity-90'>
                                                <MarkdownDisplay content={entry.content} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </GlassSurface>
            </div>

            {/* Drawer (Only for Entries) */}
            <div className={`absolute top-0 right-0 h-full w-80 z-50 transform transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className='h-full w-full bg-black/90 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl'>
                    <div className='flex items-center justify-between p-4 border-b border-white/5'>
                        <span className='text-xs font-bold uppercase tracking-wider text-zinc-400'>Settings</span>
                        <button onClick={() => setIsDrawerOpen(false)} className='text-zinc-500 hover:text-white'><ProjectIcon name='check' size={18} /></button>
                    </div>
                    <div className='p-4 space-y-4'>
                        <GlassInput value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='Search history...' className='w-full text-xs' />
                    </div>
                </div>
            </div>

            {/* Backdrop for Drawer */}
            {isDrawerOpen && <div onClick={() => setIsDrawerOpen(false)} className='absolute inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity' />}
        </div>
    );
}
