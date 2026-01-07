import React, { useEffect, useRef, useState } from 'react';
import { Scene, Character } from '../types';
import { Play, Pause, SkipBack, SkipForward, Download, RefreshCw, X } from 'lucide-react';

interface PlayerProps {
  scenes: Scene[];
  characters: Character[];
  onBack: () => void;
}

export const Player: React.FC<PlayerProps> = ({ scenes, characters, onBack }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // To download
  
  // Refs for rendering logic
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const currentScene = scenes[currentSceneIndex];
  const currentDialogueObj = currentScene?.dialogues[currentDialogueIndex];
  const activeChar = currentDialogueObj ? characters.find(c => c.id === currentDialogueObj.characterId) : null;

  // -- Canvas Rendering Loop --
  useEffect(() => {
    if (!currentScene?.imageUrl) return;

    const image = new Image();
    image.src = currentScene.imageUrl;
    image.crossOrigin = "anonymous"; // Needed for canvas export

    let loaded = false;
    image.onload = () => { loaded = true; };

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx && loaded) {
        // Ken Burns Effect Math
        // Scale from 1.0 to 1.15 over 10 seconds
        const scale = 1.0 + (Math.sin(progress * 0.0002) * 0.05); // Subtle pulse zoom
        const panX = (Math.sin(progress * 0.0001) * 20); 

        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // Draw Image (Centered with scale)
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.scale(scale, scale);
        ctx.translate(-w/2 + panX, -h/2);
        ctx.drawImage(image, 0, 0, w, h);
        ctx.restore();

        // Draw Subtitles directly on canvas (Required for video export)
        if (currentDialogueObj && isPlaying) {
          // Overlay Box
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const textHeight = 100;
          const yPos = h - textHeight - 40;
          
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(w * 0.1, yPos, w * 0.8, textHeight, 15);
            ctx.fill();
          } else {
             // Fallback for browsers without roundRect
             ctx.fillRect(w * 0.1, yPos, w * 0.8, textHeight);
          }
          
          // Character Name
          const charName = activeChar?.name || 'Unknown';
          ctx.font = 'bold 20px Inter, sans-serif';
          ctx.fillStyle = '#FFD700'; // Gold
          ctx.textAlign = 'center';
          ctx.fillText(charName.toUpperCase(), w / 2, yPos + 30);

          // Dialogue Text
          ctx.font = '24px Inter, serif';
          ctx.fillStyle = '#FFFFFF';
          wrapText(ctx, `"${currentDialogueObj.text}"`, w / 2, yPos + 60, w * 0.7, 30);
        }
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, currentSceneIndex, currentDialogueIndex, currentScene]); // Re-bind when data changes

  // Helper for text wrapping on canvas
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // -- Audio & Sequencing Logic --

  const playNextDialogue = async () => {
    if (!currentScene) return;

    if (currentDialogueIndex >= currentScene.dialogues.length) {
      // Scene Finished
      setTimeout(() => {
        if (currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
          setCurrentDialogueIndex(0);
        } else {
          setIsPlaying(false);
          stopRecording(); // Auto stop recording at end
        }
      }, 1000);
      return;
    }

    const dialogue = currentScene.dialogues[currentDialogueIndex];
    if (dialogue.audioUrl && audioRef.current) {
      audioRef.current.src = dialogue.audioUrl;
      try {
        await audioRef.current.play();
      } catch (e) {
        console.warn("Audio play error", e);
        handleDialogueEnd();
      }
    } else {
      // No audio, show text for a duration
      const duration = Math.max(2000, dialogue.text.length * 50);
      setTimeout(handleDialogueEnd, duration);
    }
  };

  const handleDialogueEnd = () => {
    if (!isPlaying) return;
    setCurrentDialogueIndex(prev => prev + 1);
  };

  useEffect(() => {
    if (isPlaying) {
      playNextDialogue();
    } else {
      if (audioRef.current) audioRef.current.pause();
    }
  }, [currentDialogueIndex, currentSceneIndex, isPlaying]);

  // -- Recording Logic --

  const setupAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      
      const dest = ctx.createMediaStreamDestination();
      destinationRef.current = dest;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;
      
      // Connect to destination (recording) AND context destination (speakers)
      source.connect(dest);
      source.connect(ctx.destination);
    }
  };

  const startRecording = () => {
    if (!canvasRef.current) return;
    setIsRecording(true);
    
    // Reset playback
    setCurrentSceneIndex(0);
    setCurrentDialogueIndex(0);
    
    setupAudioContext();

    const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
    const audioStream = destinationRef.current!.stream;
    
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });
    mediaRecorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CineGen_Movie_${Date.now()}.webm`;
      a.click();
      setIsRecording(false);
      setIsPlaying(false);
    };

    recorder.start();
    setIsPlaying(true);
    
    // Ensure audio context is running
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // -- UI --

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black relative">
      
      {/* Canvas Viewport */}
      <div className="relative w-full max-w-5xl shadow-2xl rounded-lg border border-gray-800 bg-gray-900">
        <canvas 
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-auto aspect-video rounded-lg"
        />
        
        {/* Fallback info if no image */}
        {!currentScene?.imageUrl && (
           <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-900 -z-10">
             <div className="text-center">
               <p>Scene {currentSceneIndex + 1} Image Missing</p>
               <p className="text-xs">Generate an image in the storyboard to view.</p>
             </div>
           </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={handleDialogueEnd}
        className="hidden"
        crossOrigin="anonymous" 
      />

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6">
        <button onClick={() => {
            setCurrentSceneIndex(0);
            setCurrentDialogueIndex(0);
        }} className="p-3 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" disabled={isRecording}>
          <SkipBack size={24} />
        </button>
        
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={isRecording}
          className={`p-4 rounded-full text-black hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]
             ${isRecording ? 'bg-gray-500 opacity-50' : 'bg-white'}
          `}
        >
          {isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
        </button>

        <button onClick={() => {
           if (currentSceneIndex < scenes.length - 1) setCurrentSceneIndex(prev => prev + 1);
        }} className="p-3 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" disabled={isRecording}>
          <SkipForward size={24} />
        </button>

        <div className="w-px h-10 bg-gray-800 mx-2"></div>

        <button 
          onClick={startRecording}
          disabled={isRecording || isPlaying}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all
            ${isRecording 
              ? 'bg-red-600 text-white animate-pulse' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
            disabled:opacity-50
          `}
        >
          {isRecording ? (
            <>
              <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              Recording...
            </>
          ) : (
            <>
              <Download size={20} />
              Download Video
            </>
          )}
        </button>
      </div>
      
      <div className="absolute top-6 left-6 flex gap-4">
        <button onClick={onBack} disabled={isRecording} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm disabled:opacity-50">
          ← Back to Editor
        </button>
      </div>

    </div>
  );
};