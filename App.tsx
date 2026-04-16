
import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configura il worker di PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
import { generateStoryAudio, transcribeAudio, VoiceSpeed } from './services/geminiService';
import { ApiKeyService } from './services/apiKeyService';
import { StoryService, SavedStory } from './services/storyService';
import { AuthService, User } from './services/authService';
import { LibraryPanel } from './components/LibraryPanel';
import { SaveDialog } from './components/SaveDialog';
import { Toast } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { Tutorial } from './components/Tutorial';

const App: React.FC = () => {
  // Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Toast states
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showToast, setShowToast] = useState<boolean>(false);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Verifica autenticazione e carica API key all'avvio
  useEffect(() => {
    // Verifica se l'utente è già loggato
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

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

  // Auth Functions
  const handleLogin = async (username: string, password: string) => {
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const user = await AuthService.login(username, password);
      setCurrentUser(user);
      showToastMessage(`Benvenuto, ${user.username}!`, 'success');
    } catch (error: any) {
      setAuthError(error.message || 'Errore durante il login');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string, email: string) => {
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const user = await AuthService.register(username, password, email);
      setCurrentUser(user);
      showToastMessage(`Account creato! Benvenuto, ${user.username}!`, 'success');

      // Mostra il tutorial solo per nuovi utenti
      setTimeout(() => {
        setShowTutorial(true);
      }, 1000); // Piccolo delay per far vedere il toast
    } catch (error: any) {
      setAuthError(error.message || 'Errore durante la registrazione');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setText('');
    handleStop();
    showToastMessage('Logout effettuato con successo', 'info');
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
        setError(`Errore: ${err.message || 'Errore del server. Riprova.'}`);
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

  // Toast helper
  const showToastMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Library Functions
  const loadLibrary = async () => {
    const userId = ApiKeyService.getUserId();
    const stories = await StoryService.getAllStories(userId);
    setSavedStories(stories);
  };

  const handleSaveStory = async () => {
    if (!saveTitle.trim() || !text.trim()) {
      showToastMessage('Inserisci un titolo e un testo per salvare.', 'error');
      return;
    }

    const userId = ApiKeyService.getUserId();
    const story: SavedStory = {
      title: saveTitle.trim(),
      content: text,
      category: saveCategory.trim() || undefined,
    };

    try {
      if (editingStory) {
        // Aggiorna storia esistente
        await StoryService.updateStory(userId, editingStory.id!, story);
        showToastMessage('Storia aggiornata con successo!', 'success');
      } else {
        // Salva nuova storia
        await StoryService.saveStory(userId, story);
        showToastMessage('Storia salvata con successo!', 'success');
      }

      setSaveTitle('');
      setSaveCategory('');
      setEditingStory(null);
      setShowSaveDialog(false);
      loadLibrary();
    } catch (error) {
      showToastMessage('Errore durante il salvataggio.', 'error');
    }
  };

  const handleLoadStory = (story: SavedStory) => {
    setText(story.content);
    setShowLibrary(false);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
    showToastMessage(`Storia "${story.title}" caricata!`, 'success');
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
    const userId = ApiKeyService.getUserId();

    try {
      await StoryService.deleteStory(userId, storyId);
      showToastMessage('Storia eliminata con successo!', 'success');
      loadLibrary();
    } catch (error) {
      showToastMessage('Errore durante l\'eliminazione.', 'error');
    }
  };

  const handleRenameStory = async (storyId: number, newTitle: string) => {
    const userId = ApiKeyService.getUserId();

    try {
      await StoryService.updateStory(userId, storyId, { title: newTitle });
      showToastMessage('Nome modificato con successo!', 'success');
      loadLibrary();
    } catch (error) {
      showToastMessage('Errore durante la modifica del nome.', 'error');
    }
  };

  const handleUploadDocument = async (file: File) => {
    try {
      showToastMessage('Caricamento documento...', 'info');

      const text = await extractTextFromFile(file);

      if (!text || text.trim().length === 0) {
        showToastMessage('Impossibile estrarre testo dal documento.', 'error');
        return;
      }

      const userId = ApiKeyService.getUserId();
      const story: SavedStory = {
        title: file.name.replace(/\.[^/.]+$/, ''), // Rimuove estensione
        content: text,
        category: 'Documento',
      };

      await StoryService.saveStory(userId, story);
      showToastMessage(`Documento "${file.name}" caricato con successo!`, 'success');
      loadLibrary();
    } catch (error) {
      showToastMessage('Errore durante il caricamento del documento.', 'error');
    }
  };

  // Funzione per estrarre testo da file
  const extractTextFromFile = async (file: File): Promise<string> => {
    // Gestione specifica per PDF
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // @ts-ignore - items has generic type in some versions
          const pageText = textContent.items.map((item) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        
        return fullText;
      } catch (error) {
        console.error('Errore lettura PDF:', error);
        throw new Error('Impossibile leggere il file PDF');
      }
    }

    // Gestione per altri set di caratteri e formati
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };

      reader.onerror = () => reject(new Error('Errore lettura file'));

      reader.readAsText(file);
    });
  };

  const openSaveDialog = () => {
    if (!text.trim()) {
      showToastMessage('Scrivi un testo prima di salvarlo.', 'error');
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
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 flex flex-col items-center">
      {/* Auth Modal - mostrato solo se l'utente non è loggato */}
      {!currentUser && (
        <AuthModal
          onLogin={handleLogin}
          onRegister={handleRegister}
          isLoading={isAuthLoading}
          error={authError}
        />
      )}

      {/* Tutorial - mostrato solo al primo accesso */}
      {showTutorial && currentUser && (
        <Tutorial onComplete={() => setShowTutorial(false)} />
      )}

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
              {/* Info Box - Chiave di Base */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 mb-1">✨ L'app è già pronta!</h3>
                    <p className="text-xs text-green-600 leading-relaxed">
                      Usiamo una chiave API Gemini Flash generosa di base. Puoi usare l'app subito senza configurare nulla!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-stone-500 mb-2 font-light block">
                  Chiave API Personalizzata (Opzionale)
                </label>
                <p className="text-xs text-stone-400 mb-3">
                  Vuoi usare la tua chiave personale? Inseriscila qui per avere il pieno controllo.
                </p>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-3 bg-[#FAF8F5] border border-stone-200 rounded-xl mb-4 text-stone-700 focus:ring-2 focus:ring-[#D7CCC8] focus:border-[#A1887F] outline-none transition-all"
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
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#6D4C41] hover:underline">
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#6D4C41] text-white text-xs font-medium rounded-lg hover:bg-[#5D4037] transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    castromassimo@gmail.com
                  </a>

                  {/* Termini e Privacy */}
                  <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-stone-100">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Termini e Condizioni\n\nQuesta applicazione è fornita "così com\'è" senza garanzie di alcun tipo. L\'utente è responsabile della propria chiave API Google Gemini e dei contenuti generati.');
                      }}
                      className="text-[10px] text-stone-400 hover:text-[#6D4C41] transition-colors"
                    >
                      Termini e Condizioni
                    </a>
                    <span className="text-stone-300">•</span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Privacy Policy\n\nI tuoi dati sono salvati localmente nel browser. La chiave API e le storie sono memorizzate solo sul tuo dispositivo. Non raccogliamo né condividiamo informazioni personali.');
                      }}
                      className="text-[10px] text-stone-400 hover:text-[#6D4C41] transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </div>
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
          onUploadDocument={handleUploadDocument}
          onRename={handleRenameStory}
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

      <header className="w-full grid grid-cols-3 items-start mb-8 md:mb-12 gap-2 md:gap-4">
        {/* Left: Library Button */}
        <div className="flex justify-start items-start">
          <button
            onClick={openLibrary}
            className="p-2 md:p-3 rounded-full transition-all border hover:shadow-sm text-stone-600 hover:text-[#6D4C41] hover:bg-[#F5F2EA] border-transparent hover:border-[#D7CCC8]"
            title="La Mia Biblioteca"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
        </div>

        {/* Center: Title - sempre centrato */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-block mb-2 md:mb-4">
            <img src="/logo.png" alt="Dolce Voce Narrante" className="w-12 h-12 md:w-16 md:h-16 rounded-2xl mx-auto" />
          </div>
          <h1 className="serif-font text-2xl md:text-4xl lg:text-5xl font-light text-stone-800 mb-1 md:mb-2 whitespace-nowrap">
            Dolce Voce <span className="font-semibold">Narrante</span>
          </h1>
          <p className="text-stone-500 font-light text-sm md:text-lg hidden sm:block">Trasforma le tue parole in una narrazione serena</p>
        </div>

        {/* Right: User Info & Settings */}
        <div className="flex items-start justify-end gap-1 md:gap-2">
          {currentUser && (
            <>
              <div className="text-right mr-1 md:mr-2 hidden md:block">
                <p className="text-sm font-medium text-stone-700">{currentUser.username}</p>
                <p className="text-xs text-stone-400">{currentUser.email}</p>
              </div>
              {/* Mobile: solo username */}
              <div className="text-right mr-1 block md:hidden">
                <p className="text-xs font-medium text-stone-700">{currentUser.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 md:p-3 rounded-full transition-all border hover:shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-100"
                title="Logout"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2 md:p-3 rounded-full transition-all border hover:shadow-sm ${customApiKey
              ? 'text-green-500 bg-green-50 border-green-100 hover:bg-green-100'
              : 'text-stone-400 hover:text-stone-600 hover:bg-white border-transparent hover:border-stone-100'
              }`}
            title="Impostazioni API"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </header>



      <main className="w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-6 md:p-10 border-none">
        {/* Contenitore Textarea con sfondo e decorazione e ombra NEON */}
        <div className="relative bg-[#FAF8F5] rounded-2xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(93,64,55,0.2)] hover:shadow-[0_20px_50px_-12px_rgba(93,64,55,0.3)] transition-all duration-500">

          {/* Icona libro decorativa in background - spostata ANCORA PIÙ a sinistra e MOLTO SOTTILE (6%) */}
          <div className="absolute inset-y-0 -left-32 flex items-center pointer-events-none opacity-[0.08]">
            <svg className="w-96 h-96 text-[#8D6E63] transform -rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi qui la tua storia o incolla un testo..."
            className="w-full min-h-[300px] p-6 text-xl serif-font text-stone-700 bg-transparent border-none outline-none focus:ring-0 resize-none transition-all placeholder:text-stone-300 scroll-smooth relative z-10"
          />


        </div>

        {/* Action Buttons - Spostati sotto il textarea */}
        <div className="w-full flex justify-center items-center gap-4 mt-4 z-30 relative">
          {isTranscribing && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm text-[#D4A017] border border-[#F0E68C] shadow-md animate-pulse">
              <div className="w-2 h-2 bg-[#D4A017] rounded-full animate-bounce" />
              <span>Trascrizione...</span>
            </div>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-4 rounded-full transition-all shadow-lg flex items-center justify-center group ${isRecording
              ? 'bg-[#D4A017] text-white animate-pulse ring-4 ring-[#F0E68C] scale-110'
              : 'bg-white text-stone-500 hover:text-[#D4A017] hover:bg-[#FFFDE7] hover:scale-105 border border-stone-100'
              }`}
            title={isRecording ? "Ferma registrazione" : "Dettatura vocale"}
          >
            <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>

          {text && !isRecording && (
            <>
              <button
                onClick={openSaveDialog}
                className="p-4 bg-white text-[#6D4C41] hover:text-[#5D4037] hover:bg-[#F5F2EA] rounded-full shadow-lg border border-[#D7CCC8] transition-all hover:scale-105 group"
                title="Salva storia"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                </svg>
              </button>
              <button
                onClick={clearText}
                className="p-4 bg-white text-stone-400 hover:text-stone-600 rounded-full shadow-lg border border-stone-50 transition-all hover:scale-105 group"
                title="Cancella tutto"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Velocità della voce</label>
          <div className="flex p-1 bg-stone-100 rounded-2xl w-full max-w-sm mx-auto">
            {(['slow', 'normal', 'fast'] as VoiceSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${speed === s
                  ? 'bg-white text-[#6D4C41] shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                {s === 'slow' ? 'Lenta' : s === 'normal' ? 'Normale' : 'Veloce'}
              </button>
            ))}
          </div>
        </div>

        {/* Status e Pulsanti Centrati */}
        <div className="mt-10 flex flex-col items-center justify-center gap-6">
          {/* Status Indicator */}
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isPlaying || isRecording ? 'bg-green-400 animate-pulse' : 'bg-stone-300'}`}></div>
            <span className="text-stone-500 text-sm font-medium uppercase tracking-wider">
              {isRecording ? 'Ti sto ascoltando...' : isPlaying ? 'In riproduzione...' : isGenerating ? 'Generazione in corso...' : 'Pronto per leggere'}
            </span>
          </div>

          {/* Pulsante Principale Centrato */}
          <div className="flex items-center justify-center">
            {isPlaying ? (
              <button
                onClick={handleStop}
                className="group flex items-center gap-2 px-10 py-4 bg-stone-800 text-white rounded-full font-medium hover:bg-stone-700 transition-all active:scale-95 shadow-lg"
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
                  flex items-center gap-2 px-12 py-4 rounded-full font-medium transition-all active:scale-95 shadow-lg
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

      <footer className="mt-12 text-center">
        {customApiKey && (
          <p className="text-[10px] text-green-500 font-medium">Chiave API Configurata</p>
        )}
      </footer>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default App;
