import React from 'react';
import { SavedStory } from '../services/storyService';

interface LibraryPanelProps {
    stories: SavedStory[];
    onClose: () => void;
    onLoad: (story: SavedStory) => void;
    onEdit: (story: SavedStory) => void;
    onDelete: (id: number) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
    stories,
    onClose,
    onLoad,
    onEdit,
    onDelete,
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
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
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Stories List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {stories.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="text-stone-400 text-lg">Nessuna storia salvata</p>
                            <p className="text-stone-400 text-sm mt-2">Salva le tue storie preferite per riascoltarle in seguito</p>
                        </div>
                    ) : (
                        stories.map((story) => (
                            <div
                                key={story.id}
                                className="bg-stone-50 rounded-2xl p-4 border border-stone-100 hover:border-rose-200 hover:shadow-sm transition-all group"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-stone-800 text-lg serif-font truncate">
                                            {story.title}
                                        </h3>
                                        {story.category && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-600 text-xs rounded-full">
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
                                            className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                                            title="Carica e leggi"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onEdit(story)}
                                            className="p-2 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-colors"
                                            title="Modifica"
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
