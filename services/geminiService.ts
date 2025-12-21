
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";

export type VoiceSpeed = 'slow' | 'normal' | 'fast';

export const generateStoryAudio = async (
  text: string,
  audioContext: AudioContext,
  speed: VoiceSpeed = 'normal',
  apiKey?: string
): Promise<AudioBuffer | null> => {
  // Use provided apiKey or fall back to env var
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: key });

  let mood = "in modo dolce, pacato e rassicurante";
  if (speed === 'slow') {
    mood = "molto lentamente, con lunghe pause rilassanti";
  } else if (speed === 'fast') {
    mood = "in modo fluido e chiaro, con un ritmo leggermente sostenuto";
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
  // Use provided apiKey or fall back to env var
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API_KEY_MISSING");

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
