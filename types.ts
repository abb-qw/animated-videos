export interface Character {
  id: string;
  name: string;
  description: string; // Visual description
  voiceName: string; // For TTS
  avatarUrl?: string; // Generated image
}

export interface Dialogue {
  id: string;
  characterId: string;
  text: string;
  emotion: string;
  audioUrl?: string; // Generated TTS blob URL
  isGeneratingAudio: boolean;
}

export interface Scene {
  id: string;
  order: number;
  description: string; // Scene visual description
  imagePrompt: string; // Prompt for image generation
  imageUrl?: string; // Generated image URL
  dialogues: Dialogue[];
  isGeneratingImage: boolean;
  duration?: number; // In seconds
}

export interface ScriptAnalysis {
  title: string;
  characters: Character[];
  scenes: Scene[];
}

export type AppView = 'script' | 'storyboard' | 'preview';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';
