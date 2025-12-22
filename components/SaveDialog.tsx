import React from 'react';

interface SaveDialogProps {
    isOpen: boolean;
    title: string;
    category: string;
    isEditing: boolean;
    onClose: () => void;
    onSave: () => void;
    onTitleChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
}

export const SaveDialog: React.FC<SaveDialogProps> = ({
    isOpen,
    title,
    category,
    isEditing,
    onClose,
    onSave,
    onTitleChange,
    onCategoryChange,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-light text-stone-800 serif-font">
                        {isEditing ? 'Modifica Storia' : 'Salva Storia'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-stone-500 mb-2 font-light block">
                            Titolo *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="Es: La mia storia preferita"
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-sm text-stone-500 mb-2 font-light block">
                            Categoria (opzionale)
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => onCategoryChange(e.target.value)}
                            placeholder="Es: Favole, Racconti, Poesie..."
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-all"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={onSave}
                            className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            {isEditing ? 'Aggiorna' : 'Salva'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
