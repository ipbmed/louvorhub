// Audio utilities for musical reference tones and metronome (Web Audio API).
// iOS Safari requires resume() to be awaited inside a user gesture.

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;
let unlockPromise: Promise<void> | null = null;

function createAudioContext(): AudioContext {
  const W = window as WebkitWindow;
  const AudioContextClass = window.AudioContext || W.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API não disponível neste navegador.');
  }
  return new AudioContextClass();
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = createAudioContext();
  }
  return audioCtx;
}

/** Must be called from a click/tap handler so iOS unlocks audio. */
export async function unlockAudio(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === 'running') return ctx;

  if (!unlockPromise) {
    unlockPromise = (async () => {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }

      // Silent buffer — helps some iOS versions fully unlock the audio pipeline.
      try {
        const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // ignore
      }

      if (ctx.state !== 'running') {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }
    })().finally(() => {
      unlockPromise = null;
    });
  }

  await unlockPromise;
  return ctx;
}

// Frequency table for key notes (4th octave)
const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63,
  'C#': 277.18,
  Db: 277.18,
  D: 293.66,
  'D#': 311.13,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  'F#': 369.99,
  Gb: 369.99,
  G: 392.0,
  'G#': 415.3,
  Ab: 415.3,
  A: 440.0,
  'A#': 466.16,
  Bb: 466.16,
  B: 493.88,
};

let currentOscillator: OscillatorNode | null = null;
let currentGainNode: GainNode | null = null;

function resolveNoteFrequency(note: string): number {
  const cleanNote = note
    .trim()
    .replace(/m$/, '')
    .replace(/7$/, '')
    .replace(/maj7$/i, '')
    .replace(/sus\d*$/i, '')
    .replace(/add\d+$/i, '')
    .replace(/dim$/, '')
    .replace(/aug$/, '');
  return NOTE_FREQUENCIES[cleanNote] || NOTE_FREQUENCIES[cleanNote.replace(/b$/, '#')] || 261.63;
}

export async function playReferenceTone(note: string, durationSec = 3.0): Promise<void> {
  try {
    stopReferenceTone();
    const ctx = await unlockAudio();
    const freq = resolveNoteFrequency(note);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Soft attack and decay (avoid 0 for exponentialRamp on iOS)
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);

    currentOscillator = osc;
    currentGainNode = gain;
  } catch (err) {
    console.warn('Audio tone playing unavailable:', err);
  }
}

export function stopReferenceTone(): void {
  if (currentGainNode && audioCtx) {
    try {
      currentGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      currentGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    } catch {
      // Ignore
    }
  }
  if (currentOscillator) {
    try {
      currentOscillator.stop();
      currentOscillator.disconnect();
    } catch {
      // Ignore
    }
    currentOscillator = null;
  }
  currentGainNode = null;
}

/** Schedule a metronome click at an AudioContext time (more reliable than setInterval on iOS). */
export function scheduleMetronomeClick(when: number, accent = false): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = accent ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(accent ? 1200 : 800, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.4 : 0.28, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(when);
    osc.stop(when + 0.07);
  } catch (err) {
    console.warn('Metronome click error:', err);
  }
}

/** @deprecated prefer scheduleMetronomeClick after unlockAudio */
export function playMetronomeClick(accent = false): void {
  try {
    const ctx = getAudioContext();
    scheduleMetronomeClick(ctx.currentTime, accent);
  } catch (err) {
    console.warn('Metronome click error:', err);
  }
}
