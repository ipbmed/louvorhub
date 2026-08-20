import type { ScheduleSongCustomization, Song } from '../types';

/** Aplica a versão da escala/evento sobre a música do catálogo. */
export function applySongCustomization(
  song: Song,
  custom: ScheduleSongCustomization | null | undefined,
): Song {
  if (!custom) return song;

  const bpmRaw = custom.bpm != null ? String(custom.bpm).trim() : '';
  const bpmParsed = bpmRaw !== '' ? Number(bpmRaw) : NaN;

  return {
    ...song,
    originalKey: custom.originalKey || song.originalKey,
    lyrics: custom.lyrics != null ? custom.lyrics : song.lyrics,
    timeSignature: custom.timeSignature || song.timeSignature,
    bpm: !Number.isNaN(bpmParsed) ? bpmParsed : song.bpm,
  };
}
