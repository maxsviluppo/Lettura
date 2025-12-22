
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateStoryAudio, transcribeAudio, VoiceSpeed } from './services/geminiService';
import { ApiKeyService } from './services/apiKeyService';
import { StoryService, SavedStory } from './services/storyService';
import { LibraryPanel } from './components/LibraryPanel';
import { SaveDialog } from './components/SaveDialog';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [speed, setSpeed] = useState<VoiceSpeed>('normal');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Library states
  const [showLibrary, setShowLibrary] = useState<boolean>(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [saveCategory, setSaveCategory] = useState<string>('');
  const [editingStory, setEditingStory] = useState<SavedStory | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Carica la chiave API dal database o localStorage all'avvio
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        // Prova prima dal database (se disponibile su Vercel)
        const dbKey = await ApiKeyService.getApiKey();
        if (dbKey) {
          setCustomApiKey(dbKey);
          setTempApiKey(dbKey);
          // Sincronizza anche con localStorage
          localStorage.setItem('gemini_api_key', dbKey);
          return;
        }
      } catch (error) {
        console.log('Database non disponibile, uso localStorage');
      }

      // Fallback a localStorage (per sviluppo locale)
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        setCustomApiKey(savedKey);
        setTempApiKey(savedKey);
      }
    };

    loadApiKey();
  }, []);

  const handleSaveKey = async () => {
    if (tempApiKey.trim()) {
      const trimmedKey = tempApiKey.trim();

      // Salva in localStorage (sempre disponibile)
      localStorage.setItem('gemini_api_key', trimmedKey);
      setCustomApiKey(trimmedKey);

      // Prova a salvare anche nel database (se disponibile)
      try {
        await ApiKeyService.saveApiKey(trimmedKey);
        console.log('API key salvata nel database');
      } catch (error) {
        console.log('Database non disponibile, salvata solo in localStorage');
      }

      setShowSettings(false);
      setError(null);
    } else {
      // Se l'utente cancella la chiave, la rimuoviamo da entrambi
      localStorage.removeItem('gemini_api_key');
      setCustomApiKey('');
      setTempApiKey('');

      try {
        await ApiKeyService.deleteApiKey();
      } catch (error) {
        console.log('Database non disponibile');
      }
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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
            const transcription = await transcribeAudio(base64Audio, customApiKey);
            setText(prev => (prev ? prev + " " + transcription : transcription));
          } catch (err: any) {
            if (err.message === "API_KEY_MISSING") {
              setError("Chiave API mancante. Inseriscila nelle impostazioni.");
              setShowSettings(true);
            } else if (err.message === "API_KEY_ERROR") {
              setError("Chiave API non valida. Controlla le impostazioni.");
              setShowSettings(true);
            } else {
              setError("Impossibile trascrivere l'audio. Riprova.");
            }
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
      } catch (e) { }
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
      const audioBuffer = await generateStoryAudio(text, audioContextRef.current!, speed, customApiKey);

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
        setError('Non è stato possibile generare l\'audio. Verifica la chiave API.');
      }
    } catch (err: any) {
      if (err.message === "API_KEY_ERROR") {
        setError('Errore di autenticazione. Verifica la tua chiave API nelle impostazioni.');
        setShowSettings(true);
      } else if (err.message === "API_KEY_MISSING") {
        setError('Chiave API mancante. Inseriscila nelle impostazioni.');
        setShowSettings(true);
      } else {
        setError('Errore del server. Riprova più tardi.');
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

  // Library Functions
  const loadLibrary = async () => {
    const userId = ApiKeyService.getUserId();
    const stories = await StoryService.getAllStories(userId);
    setSavedStories(stories);
  };

  const handleSaveStory = async () => {
    if (!saveTitle.trim() || !text.trim()) {
      setError('Inserisci un titolo e un testo per salvare.');
      return;
    }

    const userId = ApiKeyService.getUserId();
    const story: SavedStory = {
      title: saveTitle.trim(),
      content: text,
      category: saveCategory.trim() || undefined,
    };

    if (editingStory) {
      // Aggiorna storia esistente
      await StoryService.updateStory(userId, editingStory.id!, story);
    } else {
      // Salva nuova storia
      await StoryService.saveStory(userId, story);
    }

    setSaveTitle('');
    setSaveCategory('');
    setEditingStory(null);
    setShowSaveDialog(false);
    loadLibrary();
  };

  const handleLoadStory = (story: SavedStory) => {
    setText(story.content);
    setShowLibrary(false);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  };

  const handleEditStory = (story: SavedStory) => {
    setEditingStory(story);
    setSaveTitle(story.title);
    setSaveCategory(story.category || '');
    setText(story.content);
    setShowLibrary(false);
    setShowSaveDialog(true);
  };

  const handleDeleteStory = async (storyId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa storia?')) return;

    const userId = ApiKeyService.getUserId();
    await StoryService.deleteStory(userId, storyId);
    loadLibrary();
  };

  const openSaveDialog = () => {
    if (!text.trim()) {
      setError('Scrivi un testo prima di salvarlo.');
      return;
    }
    setEditingStory(null);
    setSaveTitle('');
    setSaveCategory('');
    setShowSaveDialog(true);
  };

  const openLibrary = () => {
    loadLibrary();
    setShowLibrary(true);
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-stone-500 mb-2 font-light block">
                  Inserisci la tua Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl mb-4 text-stone-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                />
                <button
                  onClick={handleSaveKey}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                >
                  Salva Chiave API
                </button>
              </div>
              <p className="text-[10px] text-stone-400 text-center italic leading-relaxed">
                La tua chiave viene salvata solo nel browser locale.
                <br />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:underline">
                  Ottieni una chiave gratuita qui
                </a>
              </p>

              {/* DevTools Section */}
              <div className="pt-6 mt-6 border-t border-stone-200">
                <div className="text-center space-y-3">
                  <h3 className="text-sm font-semibold text-stone-700">DevTools</h3>
                  <p className="text-xs text-stone-500 font-medium">BY CASTRO MASSIMO</p>
                  <p className="text-[10px] text-stone-400 leading-relaxed px-2">
                    Questa App è realizzata da DevTools by Castro Massimo.
                    <br />
                    Se hai bisogno di supporto, segnalazioni o di WebApp personalizzate contattaci.
                  </p>
                  <a
                    href="mailto:castromassimo@gmail.com"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    castromassimo@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Library Panel */}
      {showLibrary && (
        <LibraryPanel
          stories={savedStories}
          onClose={() => setShowLibrary(false)}
          onLoad={handleLoadStory}
          onEdit={handleEditStory}
          onDelete={handleDeleteStory}
        />
      )}

      {/* Save Dialog */}
      <SaveDialog
        isOpen={showSaveDialog}
        title={saveTitle}
        category={saveCategory}
        isEditing={editingStory !== null}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveStory}
        onTitleChange={setSaveTitle}
        onCategoryChange={setSaveCategory}
      />

      <header className="w-full flex justify-between items-start mb-12">
        {/* Left: Library Button */}
        <button
          onClick={openLibrary}
          className="p-3 rounded-full transition-all border hover:shadow-sm text-stone-600 hover:text-rose-500 hover:bg-rose-50 border-transparent hover:border-rose-100"
          title="La Mia Biblioteca"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>

        {/* Center: Title */}
        <div className="text-center">
          <div className="inline-block p-3 bg-rose-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="serif-font text-4xl md:text-5xl font-light text-stone-800 mb-2">Dolce Voce Narrante</h1>
          <p className="text-stone-500 font-light text-lg">Trasforma le tue parole in una narrazione serena</p>
        </div>

        {/* Right: Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className={`p-3 rounded-full transition-all border hover:shadow-sm ${customApiKey
            ? 'text-green-500 bg-green-50 border-green-100 hover:bg-green-100'
            : 'text-stone-400 hover:text-stone-600 hover:bg-white border-transparent hover:border-stone-100'
            }`}
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
              className={`p-3 rounded-full transition-all shadow-md ${isRecording
                ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-100'
                : 'bg-white text-stone-400 hover:text-rose-500 hover:bg-stone-50'
                }`}
              title={isRecording ? "Ferma registrazione" : "Dettatura vocale"}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>

            {text && !isRecording && (
              <>
                <button
                  onClick={openSaveDialog}
                  className="p-3 bg-white text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full shadow-sm border border-rose-100 transition-all"
                  title="Salva storia"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
                <button
                  onClick={clearText}
                  className="p-3 bg-white text-stone-400 hover:text-stone-600 rounded-full shadow-sm border border-stone-50 transition-all"
                  title="Cancella tutto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
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
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${speed === s
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
        {customApiKey && (
          <p className="mt-2 text-[10px] text-green-500 font-medium">Chiave API Configurata</p>
        )}
      </footer>
    </div>
  );
};

export default App;
