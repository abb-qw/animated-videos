import React, { useState } from 'react';
import { Sparkles, PlayCircle, Settings } from 'lucide-react';
import { analyzeScript, AnalysisOptions } from '../services/geminiService';
import { ScriptAnalysis } from '../types';

interface ScriptInputProps {
  onAnalysisComplete: (analysis: ScriptAnalysis) => void;
}

const DEFAULT_SCRIPT = `Title: The Cyberpunk Detective

Scene 1: Neon rain falls on the dark streets of Neo-Tokyo. A flying car zooms past a towering skyscraper.
Detective Kaito stands under a flickering hologram ad, lighting a cigarette. He looks tired but determined.

Kaito: (Thinking) Another night, another missing android.
Kaito: It's never simple in this city.

Scene 2: Kaito enters a dimly lit noodle bar. Steam rises from the pots. A robotic chef is chopping vegetables at high speed.
Kaito sits at the counter.

Chef-Bot: The usual, Detective?
Kaito: Make it double spicy tonight. I need to wake up.`;

export const ScriptInput: React.FC<ScriptInputProps> = ({ onAnalysisComplete }) => {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Options State
  const [language, setLanguage] = useState('English');
  const [duration, setDuration] = useState('Medium (approx 1-2 mins)');
  const [sceneCount, setSceneCount] = useState('Auto');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const options: AnalysisOptions = {
        language,
        duration,
        sceneCount
      };
      const data = await analyzeScript(script, options);
      onAnalysisComplete(data);
    } catch (err) {
      setError("Failed to analyze script. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Script Editor</h1>
          <p className="text-gray-400">Enter your script and configure settings below.</p>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        {/* Main Script Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-850 rounded-xl border border-gray-700 overflow-hidden shadow-2xl relative">
          <textarea
            className="flex-1 w-full bg-transparent text-gray-100 p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Enter your script here... Use standard screenplay format."
            disabled={isAnalyzing}
          />
          
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-400 font-medium animate-pulse">Analyzing Script & Generating Assets...</p>
            </div>
          )}
        </div>

        {/* Sidebar Options */}
        <div className="w-64 flex flex-col gap-4">
          <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
            <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
              <Settings size={16} /> Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Target Language</label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-2 focus:border-purple-500 focus:outline-none"
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Japanese</option>
                  <option>Korean</option>
                  <option>Portuguese</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Target Duration</label>
                <select 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-2 focus:border-purple-500 focus:outline-none"
                >
                  <option>Short (approx 30s)</option>
                  <option>Medium (approx 1-2 mins)</option>
                  <option>Long (approx 3+ mins)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Scene Count</label>
                <select 
                  value={sceneCount} 
                  onChange={(e) => setSceneCount(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-2 focus:border-purple-500 focus:outline-none"
                >
                  <option>Auto</option>
                  <option>3 Scenes</option>
                  <option>5 Scenes</option>
                  <option>10 Scenes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1"></div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !script.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-bold text-white shadow-lg transition-all
              ${isAnalyzing || !script.trim() 
                ? 'bg-gray-700 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-105'
              }`}
          >
            <Sparkles size={20} />
            {isAnalyzing ? 'Processing...' : 'Generate Video'}
          </button>
           <button
            onClick={() => setScript('')}
            className="w-full px-4 py-2 text-gray-500 text-sm hover:text-white transition-colors"
          >
            Clear Script
          </button>
        </div>
      </div>
      
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
    </div>
  );
};