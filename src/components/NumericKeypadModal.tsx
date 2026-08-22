import React, { useState } from 'react';
import { Song } from '../types';
import { X, Delete, ArrowRight, Music } from 'lucide-react';

interface NumericKeypadModalProps {
  songs: Song[];
  onClose: () => void;
  onSelectSong: (song: Song) => void;
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  songs,
  onClose,
  onSelectSong,
}) => {
  const [numberInput, setNumberInput] = useState<string>('');

  const handleDigitClick = (digit: string) => {
    if (numberInput.length < 4) {
      setNumberInput(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setNumberInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setNumberInput('');
  };

  // Find exact match or closest matching Song
  const targetNum = parseInt(numberInput, 10);
  const matchedSong = !isNaN(targetNum)
    ? songs.find(s => s.number && Number(s.number) === targetNum)
    : null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (matchedSong) {
      onSelectSong(matchedSong);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col text-stone-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-800 flex items-center justify-center font-bold">
              #
            </div>
            <h3 className="text-lg font-display font-bold text-emerald-100 light:text-stone-900 tracking-tight">
              Ir para o Número
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Number Display Box */}
        <div className="bg-stone-950 light:bg-stone-50 border border-stone-800 light:border-stone-200 rounded-2xl p-4 text-center mb-4 min-h-[72px] flex flex-col items-center justify-center shadow-inner">
          <span className="font-mono text-4xl font-black tracking-widest text-emerald-400 light:text-emerald-700">
            {numberInput ? `#${numberInput}` : '# ---'}
          </span>
          {matchedSong ? (
            <span className="text-xs font-serif italic text-emerald-200/90 light:text-emerald-800 mt-1 truncate max-w-full font-semibold">
              {matchedSong.title}
            </span>
          ) : numberInput ? (
            <span className="text-xs text-rose-400 light:text-rose-600 mt-1 font-semibold">Hino não encontrado</span>
          ) : (
            <span className="text-xs text-stone-400 light:text-stone-500 mt-1">Digite o número do hino</span>
          )}
        </div>

        {/* Keypad Grid (1-9, C, 0, Backspace) */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigitClick(digit)}
              className="py-3.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 active:bg-emerald-500 active:text-stone-950 rounded-button font-mono text-xl font-bold text-stone-100 light:text-stone-900 border border-stone-700/60 light:border-stone-300 shadow transition-colors"
            >
              {digit}
            </button>
          ))}

          <button
            onClick={handleClear}
            className="py-3.5 bg-rose-950/40 light:bg-rose-50 hover:bg-rose-900/60 light:hover:bg-rose-100 text-rose-300 light:text-rose-700 rounded-button font-semibold text-sm border border-rose-800/40 light:border-rose-200"
          >
            Limpar
          </button>

          <button
            onClick={() => handleDigitClick('0')}
            className="py-3.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 active:bg-emerald-500 active:text-stone-950 rounded-button font-mono text-xl font-bold text-stone-100 light:text-stone-900 border border-stone-700/60 light:border-stone-300 shadow transition-colors"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="py-3.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-stone-300 light:text-stone-700 rounded-button flex items-center justify-center border border-stone-700/60 light:border-stone-300"
            title="Apagar"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={!matchedSong}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-stone-950 font-bold rounded-button shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-base transition-all"
        >
          <Music className="w-5 h-5" />
          <span>Abrir Hino #{numberInput}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
};
