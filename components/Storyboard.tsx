import React from 'react';
import { Scene, Character, Dialogue } from '../types';
import { Mic, RefreshCw, Image as ImageIcon, Play, Film, Camera, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import { generateCharacterImage, generateSceneImage, generateTTS } from '../services/geminiService';

interface StoryboardProps {
  scenes: Scene[];
  characters: Character[];
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
  onUpdateDialogue: (sceneId: string, dialogueId: string, updates: Partial<Dialogue>) => void;
  onUpdateCharacter: (charId: string, updates: Partial<Character>) => void;
  onPreview: () => void;
}

export const Storyboard: React.FC<StoryboardProps> = ({
  scenes,
  characters,
  onUpdateScene,
  onUpdateDialogue,
  onUpdateCharacter,
  onPreview
}) => {
  
  // Character Generation
  const handleGenerateCharacterImage = async (char: Character) => {
    try {
      const url = await generateCharacterImage(char.description);
      onUpdateCharacter(char.id, { avatarUrl: url });
    } catch (e) {
      console.error(e);
      alert("Failed to generate character image");
    }
  };

  // Scene Image Generation (Replaces Video)
  const handleGenerateSceneImage = async (scene: Scene) => {
    if (scene.isGeneratingImage) return;
    onUpdateScene(scene.id, { isGeneratingImage: true });
    try {
      const url = await generateSceneImage(scene.imagePrompt);
      onUpdateScene(scene.id, { imageUrl: url, isGeneratingImage: false });
    } catch (e: any) {
      console.error(e);
      onUpdateScene(scene.id, { isGeneratingImage: false });
      alert(e.message || "Failed to generate scene image.");
    }
  };

  // Dialogue Audio Generation
  const handleGenerateAudio = async (sceneId: string, dialogue: Dialogue) => {
    if (dialogue.isGeneratingAudio) return;
    onUpdateDialogue(sceneId, dialogue.id, { isGeneratingAudio: true });
    try {
      // Find character voice preference
      const char = characters.find(c => c.id === dialogue.characterId);
      const voice = char?.voiceName || 'Kore';
      const url = await generateTTS(dialogue.text, voice);
      onUpdateDialogue(sceneId, dialogue.id, { audioUrl: url, isGeneratingAudio: false });
    } catch (e) {
      console.error(e);
      onUpdateDialogue(sceneId, dialogue.id, { isGeneratingAudio: false });
      alert("TTS generation failed");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 p-6 overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Storyboard & Editor</h2>
          <p className="text-gray-400 text-sm">Edit scenes, dialogues, and generate assets.</p>
        </div>
        <button 
          onClick={onPreview}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          <Play size={18} /> Preview Movie
        </button>
      </div>

      {/* Characters Section */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <ImageIcon size={18} /> Cast & Characters
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {characters.map(char => (
            <div key={char.id} className="bg-gray-850 border border-gray-700 rounded-lg p-3 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-3 rounded-full bg-gray-700 overflow-hidden relative group">
                {char.avatarUrl ? (
                  <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">?</div>
                )}
                <button 
                  onClick={() => handleGenerateCharacterImage(char)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <p className="text-sm font-medium text-white truncate w-full">{char.name}</p>
              <select 
                value={char.voiceName}
                onChange={(e) => onUpdateCharacter(char.id, { voiceName: e.target.value })}
                className="text-[10px] bg-gray-900 border border-gray-700 text-gray-400 rounded mt-1 px-1 w-full"
              >
                <option value="Puck">Puck (M)</option>
                <option value="Charon">Charon (M)</option>
                <option value="Fenrir">Fenrir (M)</option>
                <option value="Kore">Kore (F)</option>
                <option value="Zephyr">Zephyr (F)</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Scenes List */}
      <div className="space-y-8">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            
            {/* Scene Header */}
            <div className="bg-gray-850 p-4 border-b border-gray-800 flex justify-between items-start">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-2">
                   <h4 className="text-purple-400 font-bold uppercase tracking-wider text-xs">Scene {index + 1}</h4>
                   <span className="text-gray-600 text-xs">|</span>
                   <input 
                     className="bg-transparent text-gray-300 text-sm w-full focus:outline-none focus:border-b border-purple-500"
                     value={scene.description}
                     onChange={(e) => onUpdateScene(scene.id, { description: e.target.value })}
                     placeholder="Scene Description"
                   />
                </div>
                
                {/* Image Prompt Editor */}
                <div className="bg-black/30 p-2 rounded border border-gray-700/50">
                  <label className="block text-[10px] text-gray-500 mb-1">Image Prompt (Editable)</label>
                  <textarea 
                    className="w-full bg-transparent text-xs text-gray-400 focus:outline-none resize-none h-12"
                    value={scene.imagePrompt}
                    onChange={(e) => onUpdateScene(scene.id, { imagePrompt: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {/* Image Generation Control */}
                <div className="flex flex-col items-end gap-2">
                   {scene.imageUrl ? (
                     <div className="relative w-40 h-24 bg-black rounded border border-gray-700 overflow-hidden group">
                       <img src={scene.imageUrl} className="w-full h-full object-cover" />
                       <button 
                        onClick={() => handleGenerateSceneImage(scene)}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Regenerate Image"
                       >
                         <RefreshCw size={12} />
                       </button>
                     </div>
                   ) : (
                     <button
                      onClick={() => handleGenerateSceneImage(scene)}
                      disabled={scene.isGeneratingImage}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-xs px-3 py-2 rounded transition-colors"
                     >
                       {scene.isGeneratingImage ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                       {scene.isGeneratingImage ? 'Creating Art...' : 'Generate Scene Art'}
                     </button>
                   )}
                </div>
              </div>
            </div>

            {/* Dialogues */}
            <div className="p-4 space-y-3">
              {scene.dialogues.map(dialogue => {
                const char = characters.find(c => c.id === dialogue.characterId);
                return (
                  <div key={dialogue.id} className="flex items-start gap-4 bg-gray-950/50 p-3 rounded-lg border border-gray-800/50 group">
                    {/* Character Avatar Small */}
                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 mt-1">
                      {char?.avatarUrl && <img src={char.avatarUrl} className="w-full h-full object-cover" />}
                    </div>
                    
                    {/* Editable Text */}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-300">{char?.name || 'Unknown'}</span>
                        <input 
                          className="bg-transparent text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded uppercase w-20 focus:outline-none"
                          value={dialogue.emotion}
                          onChange={(e) => onUpdateDialogue(scene.id, dialogue.id, { emotion: e.target.value })}
                        />
                      </div>
                      <textarea
                        className="w-full bg-transparent text-gray-400 text-sm focus:outline-none resize-none focus:bg-gray-900 rounded p-1"
                        value={dialogue.text}
                        onChange={(e) => onUpdateDialogue(scene.id, dialogue.id, { text: e.target.value })}
                        rows={2}
                      />
                    </div>

                    {/* Audio Controls */}
                    <div className="flex flex-col gap-2">
                      {dialogue.audioUrl ? (
                        <div className="flex items-center gap-2">
                          <audio src={dialogue.audioUrl} controls className="h-8 w-32" />
                          <button 
                            onClick={() => handleGenerateAudio(scene.id, dialogue)}
                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
                            title="Regenerate Audio"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateAudio(scene.id, dialogue)}
                          disabled={dialogue.isGeneratingAudio}
                          className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-1.5 rounded border border-gray-700 transition-colors whitespace-nowrap"
                        >
                          {dialogue.isGeneratingAudio ? <RefreshCw size={12} className="animate-spin" /> : <Mic size={12} />}
                          Generate Voice
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};