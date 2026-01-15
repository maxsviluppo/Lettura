import React, { useState } from 'react';

interface TutorialStep {
    title: string;
    description: string;
    target: string; // CSS selector o posizione
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialProps {
    onComplete: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        title: '👋 Benvenuto!',
        description: 'Ciao! Sono qui per guidarti attraverso le funzionalità principali di Dolce Voce Narrante.',
        target: 'center',
        position: 'center',
    },
    {
        title: '✍️ Scrivi o Dettatura',
        description: 'Puoi scrivere la tua storia qui, oppure usare il microfono per dettarla vocalmente!',
        target: 'textarea',
        position: 'bottom',
    },
    {
        title: '🎤 Registrazione Vocale',
        description: 'Clicca sul microfono per registrare la tua voce. Il testo verrà trascritto automaticamente!',
        target: 'mic-button',
        position: 'left',
    },
    {
        title: '💾 Salva le tue Storie',
        description: 'Dopo aver scritto, usa il dischetto per salvare la storia nella tua biblioteca personale.',
        target: 'save-button',
        position: 'left',
    },
    {
        title: '📚 La Tua Biblioteca',
        description: 'Qui trovi tutte le storie salvate. Puoi anche caricare documenti PDF o DOC!',
        target: 'library-button',
        position: 'right',
    },
    {
        title: '🎧 Ascolta',
        description: 'Quando sei pronto, clicca "Leggi Storia" per ascoltare la narrazione con voce AI!',
        target: 'read-button',
        position: 'top',
    },
    {
        title: '⚙️ Impostazioni',
        description: 'Ricorda di inserire la tua chiave API Google Gemini nelle impostazioni per usare l\'app!',
        target: 'settings-button',
        position: 'left',
    },
    {
        title: '🎉 Tutto Pronto!',
        description: 'Ora sei pronto per creare le tue storie narrate. Buon divertimento!',
        target: 'center',
        position: 'center',
    },
];

export const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const step = TUTORIAL_STEPS[currentStep];

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const getTooltipPosition = () => {
        if (step.position === 'center') {
            return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
        }
        // Per altri posizionamenti, useremo JavaScript per calcolare la posizione
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    };

    return (
        <>
            {/* Overlay scuro */}
            <div className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-300" />

            {/* Tooltip fumetto */}
            <div className={`${getTooltipPosition()} z-[70] max-w-sm w-full mx-4 animate-in zoom-in fade-in duration-300`}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 relative">
                    {/* Freccia del fumetto */}
                    {step.position !== 'center' && (
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-white" />
                    )}

                    {/* Contenuto */}
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-light serif-font text-stone-800 mb-3">
                            {step.title}
                        </h3>
                        <p className="text-stone-600 text-sm leading-relaxed">
                            {step.description}
                        </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mb-6">
                        {TUTORIAL_STEPS.map((_, index) => (
                            <div
                                key={index}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentStep
                                        ? 'bg-rose-500 w-6'
                                        : index < currentStep
                                            ? 'bg-rose-300'
                                            : 'bg-stone-200'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            className="flex-1 py-2 px-4 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-all"
                        >
                            Salta
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex-1 py-2 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-all"
                        >
                            {currentStep < TUTORIAL_STEPS.length - 1 ? 'Avanti' : 'Inizia!'}
                        </button>
                    </div>

                    {/* Step counter */}
                    <p className="text-center text-xs text-stone-400 mt-4">
                        {currentStep + 1} di {TUTORIAL_STEPS.length}
                    </p>
                </div>
            </div>
        </>
    );
};
