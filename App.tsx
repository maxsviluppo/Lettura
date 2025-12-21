
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateStoryAudio, transcribeAudio, VoiceSpeed } from './services/geminiService';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [speed, setSpeed] = useState<VoiceSpeed>('normal');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Verifica se l'utente ha selezionato una chiave personalizzata
  useEffect(() => {
    const checkKeyStatus = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(selected);
      }
    };
    checkKeyStatus();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
      setShowSettings(false);
      setError(null);
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const transcription = await transcribeAudio(base64Audio);
            setText(prev => (prev ? prev + " " + transcription : transcription));
          } catch (err) {
            setError("Impossibile trascrivere l'audio. Riprova.");
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Permesso microfono negato o non supportato.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleStop = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const animateScroll = useCallback(() => {
    if (!isPlaying || !textareaRef.current || !audioContextRef.current) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / durationRef.current, 1);

    const textarea = textareaRef.current;
    const maxScroll = textarea.scrollHeight - textarea.clientHeight;
    
    if (maxScroll > 0) {
      textarea.scrollTop = maxScroll * progress;
    }

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, animateScroll]);

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
        
        const playbackRates = { slow: 0.95, normal: 1.0, fast: 1.1 };
        const rate = playbackRates[speed];
        source.playbackRate.value = rate;

        source.connect(audioContextRef.current!.destination);
        
        durationRef.current = audioBuffer.duration / rate;
        startTimeRef.current = audioContextRef.current!.currentTime;

        source.onended = () => {
          setIsPlaying(false);
          currentSourceRef.current = null;
        };

        if (textareaRef.current) textareaRef.current.scrollTop = 0;

        currentSourceRef.current = source;
        source.start(0);
        setIsPlaying(true);
      } else {
        setError('Non è stato possibile generare l\'audio. Prova a selezionare la tua chiave API nelle impostazioni.');
      }
    } catch (err: any) {
      if (err.message === "API_KEY_ERROR") {
        setError('Errore di autenticazione. Seleziona nuovamente la tua chiave API nelle impostazioni.');
      } else {
        setError('Errore del server (500). Se persiste, prova a usare il tuo account Pro dalle impostazioni.');
      }
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearText = () => {
    setText('');
    handleStop();
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center">
      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-stone-800 serif-font">Impostazioni API</h2>
              <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-stone-500 mb-4 font-light leading-relaxed">
                  Attualmente stai utilizzando {hasCustomKey ? <span className="text-green-600 font-medium">il tuo account Pro</span> : <span className="text-stone-700 font-medium">la configurazione predefinita</span>}.
                </p>
                <button
                  onClick={handleOpenKeyDialog}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  {hasCustomKey ? 'Cambia Account' : 'Usa Account Pro'}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 text-center italic">
                L'uso dell'account Pro risolve spesso gli errori 500 dovuti ai limiti di quota gratuiti.
              </p>
            </div>
          </div>
        </div>
      )}

      <header className="w-full flex justify-between items-start mb-12">
        <div className="invisible p-2">⚙️</div> {/* Spacer per centrare il titolo */}
        <div className="text-center">
          <div className="inline-block p-3 bg-rose-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="serif-font text-4xl md:text-5xl font-light text-stone-800 mb-2">Dolce Voce Narrante</h1>
          <p className="text-stone-500 font-light text-lg">Trasforma le tue parole in una narrazione serena</p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 text-stone-400 hover:text-stone-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-stone-100 hover:shadow-sm"
          title="Impostazioni Account"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </header>

      <main className="w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-6 md:p-10 border border-stone-100">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi qui la tua storia o incolla un testo..."
            className="w-full min-h-[300px] p-6 text-xl serif-font text-stone-700 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-rose-200 resize-none transition-all placeholder:text-stone-300 scroll-smooth"
          />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isTranscribing && (
               <div className="flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full text-xs text-rose-500 border border-rose-100 shadow-sm animate-pulse">
                 <span>Trascrizione...</span>
               </div>
            )}
            
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition-all shadow-md ${
                isRecording 
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-100' 
                  : 'bg-white text-stone-400 hover:text-rose-500 hover:bg-stone-50'
              }`}
              title={isRecording ? "Ferma registrazione" : "Dettatura vocale"}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            {text && !isRecording && (
              <button 
                onClick={clearText}
                className="p-3 bg-white text-stone-400 hover:text-stone-600 rounded-full shadow-sm border border-stone-50 transition-all"
                title="Cancella tutto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm border border-rose-100">
            {error}
          </div>
        )}

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

        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className={`w-3 h-3 rounded-full ${isPlaying || isRecording ? 'bg-green-400 animate-pulse' : 'bg-stone-300'}`}></div>
             <span className="text-stone-500 text-sm font-medium uppercase tracking-wider">
               {isRecording ? 'Ti sto ascoltando...' : isPlaying ? 'In riproduzione...' : isGenerating ? 'Generazione in corso...' : 'Pronto per leggere'}
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
                disabled={isGenerating || !text.trim() || isRecording}
                className={`
                  flex items-center gap-2 px-10 py-4 rounded-full font-medium transition-all active:scale-95 shadow-lg
                  ${(isGenerating || !text.trim() || isRecording) 
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

      <footer className="mt-12 text-stone-400 text-sm text-center">
        <p>Progettato per momenti di relax e ascolto.</p>
        {hasCustomKey && (
          <p className="mt-2 text-[10px] text-green-500 font-medium">Account Pro Attivo</p>
        )}
      </footer>
    </div>
  );
};

export default App;
