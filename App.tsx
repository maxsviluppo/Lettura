
import React, { useState, useRef, useCallback } from 'react';
import { generateStoryAudio, VoiceSpeed } from './services/geminiService';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<VoiceSpeed>('normal');
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handleStop = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleReadStory = async () => {
    if (!text.trim()) {
      setError('Per favore, inserisci una storia da leggere.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    initAudioContext();

    try {
      const audioBuffer = await generateStoryAudio(text, audioContextRef.current!, speed);
      
      if (audioBuffer) {
        handleStop();

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        
        // We can also tweak the hardware playback rate slightly for extra precision, 
        // though the prompt does most of the work.
        const playbackRates = { slow: 0.95, normal: 1.0, fast: 1.1 };
        source.playbackRate.value = playbackRates[speed];

        source.connect(audioContextRef.current!.destination);
        
        source.onended = () => {
          setIsPlaying(false);
          currentSourceRef.current = null;
        };

        currentSourceRef.current = source;
        source.start(0);
        setIsPlaying(true);
      } else {
        setError('Non è stato possibile generare l\'audio. Riprova.');
      }
    } catch (err) {
      setError('Si è verificato un errore durante la generazione dell\'audio.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearText = () => {
    setText('');
    handleStop();
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
      {/* Header */}
      <header className="text-center mb-12">
        <div className="inline-block p-3 bg-rose-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 className="serif-font text-4xl md:text-5xl font-light text-stone-800 mb-2">Dolce Voce Narrante</h1>
        <p className="text-stone-500 font-light text-lg">Trasforma le tue parole in una narrazione serena</p>
      </header>

      {/* Main Content Area */}
      <main className="w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-6 md:p-10 border border-stone-100">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi qui la tua storia o incolla un testo..."
            className="w-full min-h-[300px] p-6 text-xl serif-font text-stone-700 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-200 resize-none transition-all placeholder:text-stone-300"
          />
          {text && (
            <button 
              onClick={clearText}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-rose-400 transition-colors"
              title="Cancella tutto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm border border-rose-100 animate-pulse">
            {error}
          </div>
        )}

        {/* Speed Selection */}
        <div className="mt-8 flex flex-col gap-3">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-widest ml-1">Velocità della voce</label>
          <div className="flex p-1 bg-stone-100 rounded-2xl w-full max-w-sm">
            {(['slow', 'normal', 'fast'] as VoiceSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  speed === s 
                    ? 'bg-white text-rose-600 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {s === 'slow' ? 'Lenta' : s === 'normal' ? 'Normale' : 'Veloce'}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-stone-300'}`}></div>
             <span className="text-stone-500 text-sm font-medium uppercase tracking-wider">
               {isPlaying ? 'In riproduzione...' : isGenerating ? 'Generazione in corso...' : 'Pronto per leggere'}
             </span>
          </div>

          <div className="flex items-center gap-3">
            {isPlaying ? (
              <button
                onClick={handleStop}
                className="group flex items-center gap-2 px-8 py-4 bg-stone-800 text-white rounded-full font-medium hover:bg-stone-700 transition-all active:scale-95 shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Ferma Lettura
              </button>
            ) : (
              <button
                onClick={handleReadStory}
                disabled={isGenerating || !text.trim()}
                className={`
                  flex items-center gap-2 px-10 py-4 rounded-full font-medium transition-all active:scale-95 shadow-lg
                  ${isGenerating || !text.trim() 
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                    : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generazione...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Leggi Storia
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Decorative Footer */}
      <footer className="mt-12 text-stone-400 text-sm text-center">
        <p>Progettato per momenti di relax e ascolto.</p>
        <div className="flex justify-center gap-2 mt-2">
          <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
          <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
          <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
        </div>
      </footer>
    </div>
  );
};

export default App;
