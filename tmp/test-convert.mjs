import { readFileSync } from 'node:fs';

// Quick unit check of converter by importing logic inline
const CHORD_RE =
  /[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus\d*|add\d*|M|º|°)?\d*(?:\([^)]+\))?(?:\/[A-G](?:#|b)?)?/g;

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const withoutChords = trimmed.replace(CHORD_RE, '').replace(/\s+/g, '');
  if (withoutChords.length > 0) return false;
  const tokens = trimmed.match(CHORD_RE) || [];
  return tokens.length > 0;
}

function mergeChordLyric(chordLine, lyricLine) {
  const chords = [];
  let m;
  const re = new RegExp(CHORD_RE.source, 'g');
  while ((m = re.exec(chordLine)) !== null) {
    chords.push({ chord: m[0], index: m.index });
  }
  let lyric = lyricLine;
  for (let i = chords.length - 1; i >= 0; i--) {
    const { chord, index } = chords[i];
    const pos = Math.min(Math.max(index, 0), lyric.length);
    lyric = `${lyric.slice(0, pos)}[${chord}]${lyric.slice(pos)}`;
  }
  return lyric.replace(/\s+$/, '');
}

function chordChartToChordPro(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (isChordLine(line) && next != null && !isChordLine(next) && next.trim() !== '') {
      out.push(mergeChordLyric(line, next));
      i += 2;
      continue;
    }
    if (isChordLine(line) && (next == null || next.trim() === '')) {
      i += 1;
      continue;
    }
    out.push(line);
    i += 1;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

const plain = readFileSync('tmp/cifra-113-plain.txt', 'utf8');
const out = chordChartToChordPro(plain);
console.log(out.split('\n').slice(0, 10).join('\n'));
