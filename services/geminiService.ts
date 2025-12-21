
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || "";

export type VoiceSpeed = 'slow' | 'normal' | 'fast';

export const generateStoryAudio = async (
  text: string, 
  audioContext: AudioContext, 
  speed: VoiceSpeed = 'normal'
): Promise<AudioBuffer | null> => {
  if (!API_KEY) {
    console.error("API Key not found");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  let speedInstruction = "Mantieni un ritmo naturale, calmo e pacato.";
  if (speed === 'slow') {
    speedInstruction = "Leggi molto lentamente, con ampie pause tra le frasi per un effetto estremamente rilassante.";
  } else if (speed === 'fast') {
    speedInstruction = "Leggi con un ritmo leggermente più sostenuto e fluente, pur mantenendo la chiarezza.";
  }

  const prompt = `Agisci come una narratrice professionista. Leggi il seguente testo con una voce femminile dolce, rassicurante e chiara. 
                  ${speedInstruction}
                  Testo da leggere: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

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
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};
