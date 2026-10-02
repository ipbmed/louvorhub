import React, { useEffect, useState } from 'react';
import { Song } from '../types';
import { ArrowRight, Delete, Hash, Music } from 'lucide-react';
import { Button, Modal, cn } from './ui';

interface NumericKeypadModalProps {
  songs: Song[];
  onClose: () => void;
  onSelectSong: (song: Song) => void;
}

const KEY_BASE =
  'min-h-14 rounded-xl font-mono text-2xl font-bold border transition-colors touch-manipulation select-none active:scale-[0.97]';

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  songs,
  onClose,
  onSelectSong,
}) => {
  const [numberInput, setNumberInput] = useState<string>('');

  const handleDigitClick = (digit: string) => {
    setNumberInput((prev) => (prev.length < 4 ? prev + digit : prev));
  };
  const handleDelete = () => setNumberInput((prev) => prev.slice(0, -1));
  const handleClear = () => setNumberInput('');

  const targetNum = parseInt(numberInput, 10);
  const matchedSong = !Number.isNaN(targetNum)
    ? songs.find((s) => s.number && Number(s.number) === targetNum)
    : null;

  const handleSubmit = () => {
    if (matchedSong) {
      onSelectSong(matchedSong);
      onClose();
    }
  };

  // Teclado físico: dígitos, Backspace, Enter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedSong]);

  return (
    <Modal
      open
      onClose={onClose}
      icon={Hash}
      title="Ir para o número"
      subtitle="Digite o número do hino no hinário."
      size="sm"
    >
      <div className="space-y-4">
        <div
          className={cn(
            'rounded-2xl border p-4 text-center min-h-[5.5rem] flex flex-col items-center justify-center transition-colors',
            matchedSong
              ? 'bg-brand-soft border-brand-line'
              : numberInput
                ? 'bg-danger-soft border-danger-line'
                : 'bg-surface-2 border-line',
          )}
          aria-live="polite"
        >
          <span
            className={cn(
              'font-mono text-4xl font-black tracking-widest',
              matchedSong ? 'text-brand-text' : numberInput ? 'text-danger-text' : 'text-fg-subtle',
            )}
          >
            {numberInput ? `#${numberInput}` : '# ---'}
          </span>
          {matchedSong ? (
            <span className="text-xs text-fg mt-1 truncate max-w-full font-semibold">
              {matchedSong.title}
            </span>
          ) : numberInput ? (
            <span className="text-xs text-danger-text mt-1 font-semibold">Hino não encontrado</span>
          ) : (
            <span className="text-xs text-fg-subtle mt-1">Use o teclado abaixo ou o físico</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className={cn(KEY_BASE, 'bg-muted border-line text-fg hover:bg-muted-hover active:bg-brand active:text-brand-fg')}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={!numberInput}
            className={cn(KEY_BASE, '!text-sm font-sans font-semibold bg-danger-soft border-danger-line text-danger-text disabled:opacity-40')}
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className={cn(KEY_BASE, 'bg-muted border-line text-fg hover:bg-muted-hover active:bg-brand active:text-brand-fg')}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!numberInput}
            title="Apagar"
            aria-label="Apagar último dígito"
            className={cn(KEY_BASE, 'bg-muted border-line text-fg-muted hover:bg-muted-hover flex items-center justify-center disabled:opacity-40')}
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <Button size="lg" block icon={Music} iconRight={ArrowRight} disabled={!matchedSong} onClick={handleSubmit}>
          {matchedSong ? `Abrir hino #${numberInput}` : 'Abrir hino'}
        </Button>
      </div>
    </Modal>
  );
};
