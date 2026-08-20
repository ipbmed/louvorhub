import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { playMetronomeClick } from '../utils/audioTone';

interface MetronomeToolProps {
  initialBpm?: number;
}

function clampBpm(value: number | null | undefined, fallback = 90): number {
  const n = value == null || Number.isNaN(Number(value)) ? fallback : Number(value);
  return Math.min(300, Math.max(30, Math.round(n)));
}

export const MetronomeTool: React.FC<MetronomeToolProps> = ({ initialBpm = 90 }) => {
  const [bpm, setBpm] = useState<number>(() => clampBpm(initialBpm));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beat, setBeat] = useState<number>(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setBpm(clampBpm(initialBpm));
  }, [initialBpm]);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 / bpm) * 1000;
      timerRef.current = setInterval(() => {
        setBeat(prev => {
          const next = prev === 4 ? 1 : prev + 1;
          playMetronomeClick(next === 1);
          return next;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-stone-200">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-button font-bold flex items-center gap-2 shadow-md transition-all ${
            isPlaying ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-stone-950 hover:bg-emerald-400'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Parar</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Metrônomo</span>
            </>
          )}
        </button>

        {/* Beats Visualizer */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((b) => (
            <div
              key={b}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                isPlaying && beat === b
                  ? b === 1
                    ? 'bg-emerald-400 border-emerald-300 scale-125 shadow-lg shadow-emerald-500/50'
                    : 'bg-emerald-400 border-emerald-300 scale-110'
                  : 'bg-stone-800 border-stone-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* BPM Slider & Display */}
      <div className="flex items-center gap-3 flex-1 max-w-xs">
        <span className="font-mono font-bold text-emerald-300 min-w-[60px]">{bpm} BPM</span>
        <input
          type="range"
          min={30}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
};
