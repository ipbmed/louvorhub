import React from 'react';
import { stripChords } from '@/utils/chordTransposer';
import { isSectionMarkerContent } from '@/utils/lyricSections';

interface ChordLyricLineProps {
  line: string;
  showChords?: boolean;
  className?: string;
}

const BRACKET_RE = /\[([^\]]+)\]/g;

/**
 * Extrai letra limpa + linha de acordes alinhada por coluna.
 * Importante: acorde e letra devem usar o MESMO tamanho/peso de fonte mono,
 * senão o alinhamento por espaços quebra (ex.: text-[0.9em] / bold).
 *
 * Ex.: `De t[F]odos` →
 *       F
 *   De todos
 */
function splitChordLyric(line: string): { chordLine: string; lyricLine: string } {
  const chordMarks: { index: number; chord: string }[] = [];
  let lyricLine = '';
  let last = 0;
  BRACKET_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = BRACKET_RE.exec(line)) !== null) {
    const inner = match[1];
    lyricLine += line.slice(last, match.index);
    if (!isSectionMarkerContent(inner) && /^[A-G][#b]?/.test(inner.trim())) {
      chordMarks.push({ index: lyricLine.length, chord: inner });
    } else {
      lyricLine += match[0];
    }
    last = match.index + match[0].length;
  }
  lyricLine += line.slice(last);

  if (chordMarks.length === 0) {
    return { chordLine: '', lyricLine };
  }

  let chordLine = '';
  for (const { index, chord } of chordMarks) {
    if (chordLine.length > index) {
      if (!chordLine.endsWith(' ')) chordLine += ' ';
      chordLine += chord;
    } else {
      chordLine += ' '.repeat(index - chordLine.length) + chord;
    }
  }

  return { chordLine, lyricLine };
}

export const ChordLyricLine: React.FC<ChordLyricLineProps> = ({
  line,
  showChords = true,
  className = '',
}) => {
  if (!showChords) {
    return (
      <p className={`leading-relaxed ${className}`.trim()}>
        {stripChords(line) || '\u00A0'}
      </p>
    );
  }

  const { chordLine, lyricLine } = splitChordLyric(line);

  if (!chordLine) {
    return (
      <pre className={`font-mono font-normal tracking-normal leading-relaxed m-0 ${className}`.trim()}>
        {lyricLine || '\u00A0'}
      </pre>
    );
  }

  // <pre> + mesmas classes nas duas linhas = largura de caractere idêntica
  return (
    <pre
      className={`font-mono font-normal tracking-normal leading-tight m-0 ${className}`.trim()}
    >
      <span className="block text-emerald-400 whitespace-pre">
        {chordLine}
      </span>
      <span className="block text-inherit whitespace-pre">
        {lyricLine || '\u00A0'}
      </span>
    </pre>
  );
};
