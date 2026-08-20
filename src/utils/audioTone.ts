// Audio utilities for musical reference tones and metronome tick using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Frequency table for key notes (4th octave)
const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 261.63,
  'C#': 277.18,
  'Db': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'Gb': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'Ab': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'Bb': 466.16,
  'B': 493.88
};

let currentOscillator: OscillatorNode | null = null;
let currentGainNode: GainNode | null = null;

// Play a reference pitch tone for a note (e.g. "G" or "C")
export function playReferenceTone(note: string, durationSec = 3.0): void {
  try {
    stopReferenceTone();
    const ctx = getAudioContext();
    
    // Normalize note key
    const cleanNote = note.trim().replace(/m$/, '').replace(/7$/, '').replace(/maj7$/, '');
    const freq = NOTE_FREQUENCIES[cleanNote] || 261.63; // Default to C4 if unknown
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Soft attack and decay curve
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
    
    currentOscillator = osc;
    currentGainNode = gain;
  } catch (err) {
    console.warn('Audio tone playing unavailable:', err);
  }
}

export function stopReferenceTone(): void {
  if (currentGainNode && audioCtx) {
    try {
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
}

// Metronome click generator
export function playMetronomeClick(accent = false): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = accent ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(accent ? 1200 : 800, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    console.warn('Metronome click error:', err);
  }
}
