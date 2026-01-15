import React, { useState } from 'react';

interface AuthModalProps {
    onLogin: (username: string, password: string) => void;
    onRegister: (username: string, password: string, email: string) => void;
    isLoading: boolean;
    error: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onRegister, isLoading, error }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const cleanUser = username.trim();
        const cleanPass = password.trim();
        const cleanEmail = email.trim();

        if (isLoginMode) {
            onLogin(cleanUser, cleanPass);
        } else {
            if (cleanPass !== confirmPassword.trim()) {
                alert('Le password non corrispondono!');
                return;
            }
            onRegister(cleanUser, cleanPass, cleanEmail);
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setEmail('');
        setConfirmPassword('');
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        resetForm();
    };

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-300">
                {/* Logo/Icon */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-[#FFFDE7] rounded-full mb-4">
                        <svg className="w-12 h-12 text-[#D4A017]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <h1 className="serif-font text-3xl font-light text-stone-800 mb-2">Dolce Voce Narrante</h1>
                    <p className="text-stone-500 text-sm">
                        {isLoginMode ? 'Accedi al tuo account' : 'Crea un nuovo account'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-stone-600 mb-2 block font-medium">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Il tuo username"
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:ring-2 focus:ring-[#F0E68C] focus:border-[#D4A017] outline-none transition-all"
                            required
                            autoFocus
                        />
                    </div>

                    {!isLoginMode && (
                        <div>
                            <label className="text-sm text-stone-600 mb-2 block font-medium">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tua@email.com"
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                                required={!isLoginMode}
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-stone-600 mb-2 block font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                            required
                            minLength={6}
                        />
                    </div>

                    {!isLoginMode && (
                        <div>
                            <label className="text-sm text-stone-600 mb-2 block font-medium">Conferma Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                                required={!isLoginMode}
                                minLength={6}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-medium transition-all shadow-lg ${isLoading
                            ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                            : 'bg-[#D4A017] text-white hover:bg-[#B98A12] active:scale-95 shadow-md'
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Caricamento...
                            </span>
                        ) : (
                            isLoginMode ? 'Accedi' : 'Registrati'
                        )}
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center">
                    <p className="text-stone-500 text-sm">
                        {isLoginMode ? 'Non hai un account?' : 'Hai già un account?'}
                        {' '}
                        <button
                            onClick={toggleMode}
                            className="text-[#D4A017] font-medium hover:text-[#A67C00] transition-colors"
                        >
                            {isLoginMode ? 'Registrati' : 'Accedi'}
                        </button>
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                    <p className="text-xs text-stone-400">
                        Progettato per momenti di relax e ascolto
                    </p>
                </div>
            </div>
        </div>
    );
};
