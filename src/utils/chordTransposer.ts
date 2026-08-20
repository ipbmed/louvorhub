// Utility for parsing and transposing inline bracket chords e.g. "[C] Grandioso [G] és Tu"

import { isSectionMarkerContent } from './lyricSections';

export type { LyricSection, LyricSectionType } from './lyricSections';
export {
  parseLyricSections,
  filterSectionsForView,
  LYRIC_SECTION_DEFS,
} from './lyricSections';

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Colchetes de cifra; ignora marcadores de seção como [ESTROFE]. */
function isChordBracket(inner: string): boolean {
  if (isSectionMarkerContent(inner)) return false;
  return /^[A-G][#b]?/.test(inner.trim());
}

// Map note names to index 0-11
function noteToIndex(note: string): number {
  const cleanNote = note.trim();
  let idx = SHARPS.indexOf(cleanNote);
  if (idx !== -1) return idx;
  idx = FLATS.indexOf(cleanNote);
  if (idx !== -1) return idx;
  
  // Handlers for uncommon representations
  if (cleanNote === 'B#') return 0;
  if (cleanNote === 'Cb') return 11;
  if (cleanNote === 'E#') return 5;
  if (cleanNote === 'Fb') return 4;
  
  return -1;
}

// Transpose a single note name (e.g. "C", "F#", "Bb")
export function transposeNote(note: string, semitones: number, useFlats = false): string {
  const index = noteToIndex(note);
  if (index === -1) return note; // Return unchanged if not recognized
  
  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;
  
  return useFlats ? FLATS[newIndex] : SHARPS[newIndex];
}

// Transpose a single complex chord string (e.g. "C#m7/G#")
export function transposeChord(chordStr: string, semitones: number): string {
  if (semitones === 0) return chordStr;
  
  // Handle bass slash chords like C/G or Am7/E
  const parts = chordStr.split('/');
  const transposedParts = parts.map(part => {
    // Match the root note at start of part (e.g., C, C#, Db, A, F#)
    const match = part.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return part;
    
    const rootNote = match[1];
    const quality = match[2]; // e.g. "m7", "maj7", "dim", "sus4"
    
    // Prefer flats if original used flats (e.g., Db, Eb, Bb)
    const preferFlats = rootNote.includes('b');
    const newRoot = transposeNote(rootNote, semitones, preferFlats);
    
    return newRoot + quality;
  });
  
  return transposedParts.join('/');
}

// Transpose all bracketed chords in a lyrics text block
export function transposeLyrics(lyrics: string, semitones: number): string {
  if (semitones === 0) return lyrics;

  return lyrics.replace(/\[([^\]]+)\]/g, (match, chordInside: string) => {
    if (!isChordBracket(chordInside)) return match;
    const transposed = transposeChord(chordInside, semitones);
    return `[${transposed}]`;
  });
}

// Strip chords from lyrics for clean reading or search
export function stripChords(lyrics: string): string {
  return lyrics
    .replace(/\[([^\]]+)\]/g, (match, inner: string) => (isChordBracket(inner) ? '' : match))
    .replace(/ +/g, ' ');
}
