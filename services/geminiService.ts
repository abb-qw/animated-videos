import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, Scene, ScriptAnalysis } from "../types";

// Helper to decode audio
async function decodeAudioData(
  base64String: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await ctx.decodeAudioData(bytes.buffer);
}

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface AnalysisOptions {
  language: string;
  duration: string;
  sceneCount: string;
}

export const analyzeScript = async (scriptText: string, options: AnalysisOptions): Promise<ScriptAnalysis> => {
  const ai = getAIClient();
  
  const prompt = `
    You are a professional movie director assistant. Analyze the following movie script.
    
    Configuration:
    - Target Language: ${options.language}
    - Target Duration: ${options.duration}
    - Target Scene Count: ${options.sceneCount} (Try to stick to this number of scenes)

    Tasks:
    1. Break the script into scenes.
    2. Extract characters. 
       CRITICAL: You MUST identify the gender of the character to assign the correct voice.
       - If Male, choose strictly between: 'Puck', 'Charon', 'Fenrir'.
       - If Female, choose strictly between: 'Kore', 'Zephyr'.
    3. Extract detailed visual descriptions for characters and environments.
    4. Format the output strictly as JSON.
    
    Script:
    ${scriptText}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING, description: "Physical visual appearance for image generation" },
                voiceName: { type: Type.STRING, description: "Must be one of: Puck, Charon, Fenrir, Kore, Zephyr" }
              },
              required: ["id", "name", "description", "voiceName"]
            }
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                order: { type: Type.INTEGER },
                description: { type: Type.STRING, description: "General scene setting" },
                imagePrompt: { type: Type.STRING, description: "A detailed prompt for generating a cinematic 16:9 background image for this scene." },
                dialogues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      characterId: { type: Type.STRING },
                      text: { type: Type.STRING },
                      emotion: { type: Type.STRING }
                    },
                    required: ["id", "characterId", "text", "emotion"]
                  }
                }
              },
              required: ["id", "order", "description", "imagePrompt", "dialogues"]
            }
          }
        },
        required: ["title", "characters", "scenes"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as ScriptAnalysis;
};

export const generateCharacterImage = async (description: string): Promise<string> => {
  const ai = getAIClient();
  
  // Using Flash Image for character portraits
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A cinematic character portrait, high quality, 8k, detailed: ${description}` }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate character image");
};

export const generateSceneImage = async (prompt: string): Promise<string> => {
  const ai = getAIClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Cinematic movie scene, wide angle, high resolution, photorealistic, 8k, dramatic lighting: ${prompt}` }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate scene image");
};


export const generateTTS = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = getAIClient();
  
  // Supported: Puck, Charon, Kore, Fenrir, Zephyr
  const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
  const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: selectedVoice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  // Convert to Blob URL
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return URL.createObjectURL(wavify(bytes, 24000));
};

// Simple utility to add WAV header to raw PCM data
function wavify(pcmData: Uint8Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16; 
  
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}