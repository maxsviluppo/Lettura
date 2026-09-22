
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
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [showKeyVisible, setShowKeyVisible] = useState<boolean>(false);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      localStorage.removeItem('GEMINI_API_KEY');
      localStorage.removeItem('gemini_api_key');
      setHasCustomKey(false);
      setKeySavedMessage('Chiave rimossa.');
    } else {
      localStorage.setItem('GEMINI_API_KEY', trimmed);
      setHasCustomKey(true);
      setKeySavedMessage('✓ Chiave API salvata con successo!');
      setError(null);
    }
    setTestResult(null);
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleTestApiKey = async () => {
    const key = apiKeyInput.trim() || localStorage.getItem('GEMINI_API_KEY') || '';
    if (!key) {
      setTestResult({ success: false, message: 'Inserisci prima una chiave API da testare.' });
      return;
    }
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: '✓ Connessione riuscita! Chiave valida e funzionante su Google AI.' });
      } else {
        const msg = data.error?.message || `Errore Google (${res.status})`;
        setTestResult({ success: false, message: `Errore: ${msg}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `Errore di rete: ${e.message}` });
    } finally {
      setIsTestingKey(false);
    }
  };
  
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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
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
        
        const playbackRates = { slow: 1.0, normal: 1.1, fast: 1.25 };
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
      if (err.message === "API_KEY_MISSING") {
        setError('Manca la chiave API Gemini. Inseriscila nelle impostazioni (pulsante 🔑 in alto).');
      } else if (err.message === "API_KEY_ERROR") {
        setError('Errore di autenticazione: la chiave inserita non è valida o non ha i permessi su Google AI Studio. Aprila nelle impostazioni e premi "Testa Chiave" per verificare.');
      } else {
        setError(`Errore generazione audio: ${err.message || 'Errore del server'}. Riprova tra pochi istanti.`);
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-light text-stone-800 serif-font">Impostazioni</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-8">              {/* API Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Configurazione API</h3>
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded font-bold">Gemini 3.8</span>
                </div>
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                  <p className="text-sm text-stone-500 mb-4 font-light leading-relaxed">
                    Stato: {hasCustomKey || localStorage.getItem('GEMINI_API_KEY') ? <span className="text-green-600 font-medium">Account Pro / API Key Attiva</span> : <span className="text-stone-700 font-medium">Chiave predefinita</span>}.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Pulsante rapido per aprire il pannello API Key di Google AI Studio */}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-sm text-sm group"
                      title="Apri la console di Google AI Studio per creare o copiare la tua API Key"
                    >
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      <span>Apri Pannello API Key (Google AI Studio)</span>
                      <svg className="w-4 h-4 text-stone-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>

                    {window.aistudio && (
                      <button
                        onClick={handleOpenKeyDialog}
                        className="w-full py-2.5 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>Seleziona tramite AI Studio Bridge</span>
                      </button>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-stone-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-2 bg-stone-50 text-[10px] font-black uppercase tracking-widest text-stone-400">Inserimento Chiave</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="relative flex items-center">
                        <input 
                          type={showKeyVisible ? "text" : "password"}
                          placeholder="Incolla qui la tua API Key Gemini..."
                          value={apiKeyInput}
                          onChange={(e) => {
                            setApiKeyInput(e.target.value);
                            setKeySavedMessage(null);
                          }}
                          className="w-full pl-4 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-200 outline-none transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyVisible(!showKeyVisible)}
                          className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                          title={showKeyVisible ? "Nascondi chiave" : "Mostra chiave"}
                        >
                          {showKeyVisible ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveApiKey}
                          className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-medium transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          Salva Chiave
                        </button>
                        <button
                          type="button"
                          disabled={isTestingKey}
                          onClick={handleTestApiKey}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium border border-stone-200 transition-all flex items-center gap-1 disabled:opacity-50"
                          title="Testa validità della chiave su Google AI"
                        >
                          {isTestingKey ? (
                            <svg className="animate-spin h-3.5 w-3.5 text-stone-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          )}
                          Testa
                        </button>
                        {apiKeyInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setApiKeyInput('');
                              localStorage.removeItem('GEMINI_API_KEY');
                              localStorage.removeItem('gemini_api_key');
                              setHasCustomKey(false);
                              setKeySavedMessage('Chiave rimossa.');
                              setTestResult(null);
                              setTimeout(() => setKeySavedMessage(null), 3000);
                            }}
                            className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-500 rounded-xl text-xs font-medium border border-stone-200 transition-all"
                            title="Rimuovi chiave salvata"
                          >
                            Rimuovi
                          </button>
                        )}
                      </div>

                      {keySavedMessage && (
                        <p className={`text-xs text-center font-medium mt-1 ${keySavedMessage.includes('✓') ? 'text-green-600' : 'text-stone-500'}`}>
                          {keySavedMessage}
                        </p>
                      )}

                      {testResult && (
                        <div className={`p-2.5 rounded-xl text-xs font-medium mt-1.5 border leading-relaxed ${
                          testResult.success
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {testResult.message}
                        </div>
                      )}

                      <p className="text-[9px] text-stone-400 px-1 leading-tight mt-1">
                        La chiave viene salvata solo localmente nel tuo browser (localStorage).
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Developer Info Section */}
              <section>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Informazioni</h3>
                <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-100/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                    <span className="text-sm font-bold text-stone-800 tracking-tight">DevTools BY CASTRO MASSIMO</span>
                  </div>
                  <p className="text-sm text-stone-600 font-light leading-relaxed mb-6">
                    Questa App è realizzata da DevTools by Castro Massimo.
                    Se hai bisogno di supporto, segnalazioni o di WebApp personalizzate contattaci.
                  </p>
                  <a
                    href="mailto:castromassimo@gmail.com"
                    className="w-full py-3 bg-white text-rose-600 border border-rose-200 rounded-xl font-medium hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Contattaci via Email
                  </a>
                </div>
              </section>
            </div>
            
            <div className="mt-8 pt-6 border-t border-stone-100 text-center">
              <p className="text-[10px] text-stone-400 italic">Versione 1.0.0 • Made with serenity</p>
            </div>
          </div>
        </div>
      )}

      <header className="w-full flex justify-between items-start mb-12">
        <button 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-all shadow-sm border border-stone-200/60"
          title="Gestisci o inserisci API Key"
        >
          <span className="text-xs">🔑</span>
          <span className="hidden sm:inline">
            {hasCustomKey || localStorage.getItem('GEMINI_API_KEY') ? 'API Key Attiva' : 'Inserisci API Key'}
          </span>
        </button>
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
          <div className="flex p-1 bg-stone-100 rounded-2xl w-full max-sm:w-full max-w-sm">
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

      <footer className="mt-12 text-stone-400 text-sm text-center flex flex-col items-center gap-1.5">
        <p>© {new Date().getFullYear()} Dolce Voce Narrante</p>
        <p>Progettato per momenti di relax e ascolto.</p>
        <p className="text-xs text-stone-500 mt-1">
          <a
            href="https://codecafe.it"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-700 hover:text-rose-500 font-medium transition-colors underline underline-offset-4"
          >
            codecafe.it
          </a>{' '}
          by Castro Massimo
        </p>
        {(hasCustomKey || localStorage.getItem('GEMINI_API_KEY')) && (
          <p className="mt-1 text-[10px] text-green-600 font-medium">Account Pro / API Key Attiva</p>
        )}
      </footer>
    </div>
  );
};

export default App;
