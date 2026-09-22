
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";

export type VoiceSpeed = 'slow' | 'normal' | 'fast';

export const getActiveApiKey = async (): Promise<string> => {
  // 1. Priorità massima: Chiave inserita dall'utente nelle impostazioni (localStorage)
  if (typeof localStorage !== 'undefined') {
    const local = (localStorage.getItem('GEMINI_API_KEY') || localStorage.getItem('gemini_api_key'))?.trim();
    if (local && local !== 'undefined' && local !== 'null') {
      return local;
    }
  }

  // 2. AIStudio bridge se disponibile
  if (typeof window !== 'undefined' && window.aistudio?.getApiKey) {
    try {
      const bridgeKey = await window.aistudio.getApiKey();
      if (bridgeKey && bridgeKey !== 'undefined') {
        return bridgeKey.trim();
      }
    } catch (e) {}
  }

  // 3. Fallback su variabile d'ambiente
  const envKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '')?.trim();
  if (envKey && envKey !== 'undefined' && envKey !== 'null') {
    return envKey;
  }

  return '';
};

export const generateStoryAudio = async (
  text: string, 
  audioContext: AudioContext, 
  speed: VoiceSpeed = 'normal'
): Promise<AudioBuffer | null> => {
  const apiKey = await getActiveApiKey();

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let mood = "in modo dolce, pacato e rassicurante";
  if (speed === 'slow') {
    mood = "molto lentamente, con lunghe pause rilassanti";
  } else if (speed === 'fast') {
    mood = "in modo fluido e chiaro, con un ritmo leggermente sostenuto";
  }

  const fullPrompt = `Leggi questa storia con una voce femminile ${mood}: ${text}`;

  // Priorità: Gemini 3.8, con fallback sui modelli TTS stabili (3.1 e 2.5) per garantire riproduzione continua anche con picchi di carico
  const ttsModelsToTry = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts"
  ];

  let lastError: any = null;
  let authErrorDetected = false;

  for (const modelName of ttsModelsToTry) {
    try {
      console.log(`[Dolce Voce] Tentativo TTS con modello: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;

      if (base64Audio) {
        console.log(`[Dolce Voce] Audio generato con successo con ${modelName}!`);
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(
          decodedBytes,
          audioContext,
          24000,
          1
        );
        return audioBuffer;
      }
    } catch (error: any) {
      console.warn(`[Dolce Voce] Modello ${modelName} non riuscito:`, error?.message);
      lastError = error;
      const msg = error?.message || '';
      if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID") || msg.includes("leaked") || msg.includes("PERMISSION_DENIED")) {
        authErrorDetected = true;
      }
      // Continua con il modello successivo nel fallback
      continue;
    }
  }

  if (authErrorDetected) {
    throw new Error("API_KEY_ERROR");
  }

  if (lastError) {
    throw lastError;
  }
  return null;
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const apiKey = await getActiveApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  
  const sttModelsToTry = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash"
  ];

  for (const modelName of sttModelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "audio/webm",
                  data: base64Audio,
                },
              },
              { text: "Trascrivi questo audio fedelmente in testo italiano. Restituisci solo la trascrizione senza alcun commento aggiuntivo." },
            ],
          },
        ],
      });

      if (response.text) return response.text;
    } catch (error) {
      console.warn(`Transcription attempt with model ${modelName} failed:`, error);
      continue;
    }
  }

  return "";
};
