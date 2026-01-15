import React, { useState, useRef } from 'react';
import { SavedStory } from '../services/storyService';

interface LibraryPanelProps {
    stories: SavedStory[];
    onClose: () => void;
    onLoad: (story: SavedStory) => void;
    onEdit: (story: SavedStory) => void;
    onDelete: (id: number) => void;
    onUploadDocument: (file: File) => void;
    onRename: (id: number, newTitle: string) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
    stories,
    onClose,
    onLoad,
    onEdit,
    onDelete,
    onUploadDocument,
    onRename,
}) => {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];

            if (validTypes.includes(file.type)) {
                onUploadDocument(file);
            } else {
                alert('Formato non supportato. Carica PDF, DOC, DOCX o TXT.');
            }
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startRename = (story: SavedStory) => {
        setEditingId(story.id!);
        setEditTitle(story.title);
    };

    const saveRename = (id: number) => {
        if (editTitle.trim()) {
            onRename(id, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditTitle('');
    };

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[80vh] shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-light text-stone-800 serif-font">La Mia Biblioteca</h2>
                        <p className="text-sm text-stone-500 mt-1">{stories.length} {stories.length === 1 ? 'storia salvata' : 'storie salvate'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Upload Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-[#6D4C41] text-white rounded-full hover:bg-[#5D4037] transition-all shadow-sm"
                            title="Carica documento"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stories List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {stories.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="text-stone-400 text-lg">Nessuna storia salvata</p>
                            <p className="text-stone-400 text-sm mt-2">Salva le tue storie preferite o carica un documento</p>
                        </div>
                    ) : (
                        stories.map((story) => (
                            <div
                                key={story.id}
                                className="bg-[#FAF8F5] rounded-2xl p-4 border border-stone-100 hover:border-[#D4A017] hover:shadow-sm transition-all group"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        {editingId === story.id ? (
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 bg-white border border-[#D4A017] rounded-lg text-stone-800 font-medium focus:ring-2 focus:ring-[#F0E68C] outline-none"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveRename(story.id!);
                                                        if (e.key === 'Escape') cancelRename();
                                                    }}
                                                />
                                                <button
                                                    onClick={() => saveRename(story.id!)}
                                                    className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                                    title="Salva"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={cancelRename}
                                                    className="p-1.5 bg-stone-300 text-stone-700 rounded-lg hover:bg-stone-400"
                                                    title="Annulla"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <h3 className="font-medium text-stone-800 text-lg serif-font truncate">
                                                {story.title}
                                            </h3>
                                        )}
                                        {story.category && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#FFFDE7] text-[#8D6E63] text-xs rounded-full border border-[#FFF59D]">
                                                {story.category}
                                            </span>
                                        )}
                                        <p className="text-stone-500 text-sm mt-2 line-clamp-2">
                                            {story.content}
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
                                            <span>📅 {formatDate(story.created_at)}</span>
                                            {story.play_count && story.play_count > 0 && (
                                                <span>🎧 {story.play_count} {story.play_count === 1 ? 'ascolto' : 'ascolti'}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => onLoad(story)}
                                            className="p-2 bg-[#6D4C41] text-white rounded-lg hover:bg-[#5D4037] transition-colors"
                                            title="Carica e leggi"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => startRename(story)}
                                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                            title="Rinomina"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onEdit(story)}
                                            className="p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-colors"
                                            title="Modifica contenuto"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onDelete(story.id!)}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                            title="Elimina"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
