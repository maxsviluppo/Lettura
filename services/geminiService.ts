
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";

export type VoiceSpeed = 'slow' | 'normal' | 'fast';

// Chiave API recuperata dalle variabili d'ambiente
const DEFAULT_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

export const generateStoryAudio = async (
  text: string,
  audioContext: AudioContext,
  speed: VoiceSpeed = 'normal',
  apiKey?: string
): Promise<AudioBuffer | null> => {
  // Usa la chiave personalizzata dell'utente, o quella globale dalle env vars
  // Supporta sia VITE_GOOGLE_API_KEY (standard Vite) che API_KEY (configurazione esistente)
  const key = apiKey || DEFAULT_API_KEY || (process as any).env?.API_KEY;

  if (!key) {
    console.error("Gemini API Key mancante. Verifica le impostazioni o il file .env");
    // Non lanciamo errore subito per permettere alla UI di gestire la cosa, 
    // ma GoogleGenAI fallirà se la chiave è vuota.
  }

  const ai = new GoogleGenAI({ apiKey: key });

  let mood = "in modo dolce e pacato, con un ritmo moderato e naturale";
  if (speed === 'slow') {
    mood = "molto lentamente e con calma, facendo lunghe pause tra le frasi per favorire il rilassamento";
  } else if (speed === 'fast') {
    mood = "con un ritmo vivace e dinamico, mantenendo chiarezza ma accelerando il parlato";
  }

  const fullPrompt = `Leggi questa storia con una voce femminile ${mood}: ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
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
      const decodedBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        decodedBytes,
        audioContext,
        24000,
        1
      );
      return audioBuffer;
    }

    return null;
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    if (error?.message?.includes("Requested entity was not found") || error?.status === 403) {
      throw new Error("API_KEY_ERROR");
    }
    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string, apiKey?: string): Promise<string> => {
  // Usa la chiave personalizzata dell'utente, o quella globale dalle env vars
  const key = apiKey || DEFAULT_API_KEY || (process as any).env?.API_KEY;

  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
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

    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};
