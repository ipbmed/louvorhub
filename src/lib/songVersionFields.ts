import { parseBpm } from '@/lib/bpm';

export type SongVersionFieldErrors = {
  lyrics?: string;
  bpm?: string;
  timeSignature?: string;
  key?: string;
};

export type SongVersionFieldValues = {
  lyrics: string;
  bpm: string;
  timeSignature: string;
  key?: string;
  allowedKeys?: string[];
};

export type SongVersionValidationResult =
  | {
      ok: true;
      lyrics: string;
      bpm: string | undefined;
      timeSignature: string | undefined;
      key: string | undefined;
    }
  | {
      ok: false;
      errors: SongVersionFieldErrors;
      message: string;
    };

const TIME_SIGNATURE_RE = /^\d{1,2}\/\d{1,2}$/;

export function validateBpmField(value: string): { value: number | null; error?: string } {
  const raw = value.trim();
  if (!raw) return { value: null };

  if (!/\d/.test(raw)) {
    return {
      value: null,
      error: 'Informe um BPM entre 30 e 300, ou deixe em branco.',
    };
  }

  try {
    return { value: parseBpm(raw) };
  } catch (err) {
    return { value: null, error: (err as Error).message };
  }
}

export function validateTimeSignatureField(
  value: string,
): { value: string | null; error?: string } {
  const raw = value.trim();
  if (!raw) return { value: null };
  if (!TIME_SIGNATURE_RE.test(raw)) {
    return {
      value: null,
      error: 'Use o formato N/N, ex: 4/4, 3/4 ou 6/8.',
    };
  }
  return { value: raw };
}

export function validateSongVersionFields(
  input: SongVersionFieldValues,
): SongVersionValidationResult {
  const errors: SongVersionFieldErrors = {};
  const lyrics = input.lyrics.trim();
  if (!lyrics) {
    errors.lyrics = 'Informe a letra da música.';
  }

  const bpmResult = validateBpmField(input.bpm);
  if (bpmResult.error) errors.bpm = bpmResult.error;

  const timeResult = validateTimeSignatureField(input.timeSignature);
  if (timeResult.error) errors.timeSignature = timeResult.error;

  const key = input.key?.trim() || '';
  if (key && input.allowedKeys?.length && !input.allowedKeys.includes(key)) {
    errors.key = 'Selecione um tom válido.';
  }

  const keys = Object.keys(errors) as (keyof SongVersionFieldErrors)[];
  if (keys.length) {
    return {
      ok: false,
      errors,
      message: errors[keys[0]] || 'Corrija os campos destacados.',
    };
  }

  return {
    ok: true,
    lyrics,
    bpm: bpmResult.value != null ? String(bpmResult.value) : undefined,
    timeSignature: timeResult.value ?? undefined,
    key: key || undefined,
  };
}
