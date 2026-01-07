import React, { useState } from 'react';
import { ScriptInput } from './components/ScriptInput';
import { Storyboard } from './components/Storyboard';
import { Player } from './components/Player';
import { AppView, ScriptAnalysis, Scene, Character, Dialogue } from './types';
import { Film, BookOpen, Layers } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<AppView>('script');
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);

  // -- State Updaters --

  const handleScriptAnalysis = (data: ScriptAnalysis) => {
    // Generate UUIDs if missing from AI or just clean up structure if needed
    // Assuming AI returns good structure based on Schema.
    setAnalysis(data);
    setView('storyboard');
  };

  const updateScene = (sceneId: string, updates: Partial<Scene>) => {
    if (!analysis) return;
    setAnalysis(prev => ({
      ...prev!,
      scenes: prev!.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s)
    }));
  };

  const updateDialogue = (sceneId: string, dialogueId: string, updates: Partial<Dialogue>) => {
    if (!analysis) return;
    setAnalysis(prev => ({
      ...prev!,
      scenes: prev!.scenes.map(s => {
        if (s.id !== sceneId) return s;
        return {
          ...s,
          dialogues: s.dialogues.map(d => d.id === dialogueId ? { ...d, ...updates } : d)
        };
      })
    }));
  };

  const updateCharacter = (charId: string, updates: Partial<Character>) => {
    if (!analysis) return;
    setAnalysis(prev => ({
      ...prev!,
      characters: prev!.characters.map(c => c.id === charId ? { ...c, ...updates } : c)
    }));
  };

  // -- Render Logic --

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Film size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden lg:block">CineGen</span>
          </div>
          
          <nav className="mt-8 px-4 space-y-2">
            <button 
              onClick={() => setView('script')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'script' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
            >
              <BookOpen size={20} />
              <span className="hidden lg:block">Script</span>
            </button>
            <button 
               onClick={() => analysis && setView('storyboard')}
               disabled={!analysis}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'storyboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'} ${!analysis ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Layers size={20} />
              <span className="hidden lg:block">Storyboard</span>
            </button>
          </nav>
        </div>

        <div className="p-6 text-xs text-gray-500 hidden lg:block">
          <p>Powered by Google Gemini 2.0 & Veo</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {view === 'script' && (
          <ScriptInput onAnalysisComplete={handleScriptAnalysis} />
        )}

        {view === 'storyboard' && analysis && (
          <Storyboard 
            scenes={analysis.scenes}
            characters={analysis.characters}
            onUpdateScene={updateScene}
            onUpdateDialogue={updateDialogue}
            onUpdateCharacter={updateCharacter}
            onPreview={() => setView('preview')}
          />
        )}

        {view === 'preview' && analysis && (
          <Player 
            scenes={analysis.scenes}
            characters={analysis.characters}
            onBack={() => setView('storyboard')}
          />
        )}
      </main>

      {/* Mobile Nav Overlay (Simple for now) */}
      <div className="md:hidden absolute bottom-0 w-full bg-gray-900 border-t border-gray-800 flex justify-around p-4">
          <button onClick={() => setView('script')} className={view === 'script' ? 'text-indigo-400' : 'text-gray-500'}><BookOpen /></button>
          <button onClick={() => analysis && setView('storyboard')} disabled={!analysis} className={view === 'storyboard' ? 'text-indigo-400' : 'text-gray-500'}><Layers /></button>
      </div>

    </div>
  );
}
