import React, { useState } from 'react';
import { Song, WorshipSchedule, ScheduleSongCustomization } from '../types';
import { 
  X, 
  Save, 
  RotateCcw, 
  Music, 
  FileText, 
  Sparkles, 
  Tag, 
  Clock, 
  Edit3, 
  Check, 
  HelpCircle,
  Eye,
  Info,
  AlertCircle
} from 'lucide-react';
import { validateSongVersionFields, type SongVersionFieldErrors } from '@/lib/songVersionFields';
import { transposeLyrics, transposeNote, parseLyricSections } from '../utils/chordTransposer';
import { LyricSectionHeading } from './LyricSectionHeading';
import { ChordLyricLine } from './ChordLyricLine';

interface ScheduleSongEditorModalProps {
  schedule: WorshipSchedule;
  song: Song;
  customization?: ScheduleSongCustomization | null;
  onSave: (customization: ScheduleSongCustomization) => void;
  onResetToOriginal?: (songId: string) => void;
  onClose: () => void;
}

const COMMON_KEYS = [
  'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
];

export const ScheduleSongEditorModal: React.FC<ScheduleSongEditorModalProps> = ({
  schedule,
  song,
  customization,
  onSave,
  onResetToOriginal,
  onClose,
}) => {
  const [key, setKey] = useState<string>(
    customization?.originalKey || song.originalKey || 'C'
  );
  const [bpm, setBpm] = useState<string>(
    customization?.bpm || (song.bpm != null ? String(song.bpm) : '')
  );
  const [timeSignature, setTimeSignature] = useState<string>(
    customization?.timeSignature || song.timeSignature || '4/4'
  );
  const [notes, setNotes] = useState<string>(
    customization?.notes || ''
  );
  const [lyrics, setLyrics] = useState<string>(
    customization?.lyrics || song.lyrics || ''
  );
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [fieldErrors, setFieldErrors] = useState<SongVersionFieldErrors>({});
  const [formError, setFormError] = useState<string>('');

  const dateFormatted = new Date(schedule.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const clearFieldError = (field: keyof SongVersionFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError('');
  };

  // Handle chord transposition by semitones in the lyrics textarea
  const handleTransposeLyrics = (semitones: number) => {
    if (!lyrics) return;
    const transposed = transposeLyrics(lyrics, semitones);
    setLyrics(transposed);
    clearFieldError('lyrics');

    // Also update the Key field if recognized
    if (key) {
      const isMinor = key.endsWith('m');
      const rootKey = isMinor ? key.slice(0, -1) : key;
      const newRoot = transposeNote(rootKey, semitones, key.includes('b'));
      setKey(isMinor ? `${newRoot}m` : newRoot);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validateSongVersionFields({
      lyrics,
      bpm,
      timeSignature,
      key,
      allowedKeys: COMMON_KEYS,
    });

    if (validated.ok === false) {
      setFieldErrors(validated.errors);
      setFormError(validated.message);
      setActiveTab('editor');
      return;
    }

    const updatedCustomization: ScheduleSongCustomization = {
      songId: song.id,
      title: song.title,
      originalKey: validated.key,
      bpm: validated.bpm,
      timeSignature: validated.timeSignature,
      lyrics: validated.lyrics,
      notes: notes.trim() || undefined,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
    };
    setFieldErrors({});
    setFormError('');
    onSave(updatedCustomization);
    onClose();
  };

  const insertTextAtCursor = (textToInsert: string) => {
    setLyrics(prev => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + textToInsert);
  };

  const isCustomized = customization?.isCustomized || (
    customization && (
      customization.originalKey !== song.originalKey ||
      customization.lyrics !== song.lyrics ||
      customization.bpm ||
      customization.notes
    )
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 uppercase">
                  Versão da Escala ({dateFormatted})
                </span>
                {isCustomized && (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    Cópia Customizada Ativa
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-display font-bold text-stone-100 mt-1 flex items-center gap-2">
                <span>{song.songType === 'hino' ? `Hino nº ${song.number} -` : ''} {song.title}</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Edite a cifra, letra, tom e arranjo exclusivamente para a escala de <span className="text-emerald-300 font-semibold">{schedule.serviceType}</span>. O hino principal do catálogo não será alterado.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-button transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-stone-950/70 border-b border-stone-800 px-4 pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 text-xs font-bold rounded-t-button border-t border-x transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-stone-900 border-stone-800 text-emerald-400 border-b-transparent'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editar Cópia do Dia</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-xs font-bold rounded-t-button border-t border-x transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-stone-900 border-stone-800 text-emerald-400 border-b-transparent'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pré-visualização da Cifra</span>
            </button>
          </div>

          {isCustomized && onResetToOriginal && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja descartar a versão própria desta escala e restaurar a versão original do acervo?')) {
                  onResetToOriginal(song.id);
                  onClose();
                }
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-semibold pb-1 rounded-button"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Original</span>
            </button>
          )}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" noValidate>
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {activeTab === 'editor' ? (
            <>
              {/* Row 1: Key, BPM, Time Signature */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800">
                
                {/* Tom / Key Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      Tom da Escala
                    </span>
                    {song.originalKey && (
                      <span className="text-[10px] text-stone-500 font-normal">
                        Original: {song.originalKey}
                      </span>
                    )}
                  </label>
                  <select
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value);
                      clearFieldError('key');
                    }}
                    className={`w-full bg-stone-900 border rounded-xl px-3 py-2 text-stone-100 text-xs font-mono focus:outline-none focus:border-emerald-500 font-bold ${
                      fieldErrors.key ? 'border-rose-500' : 'border-stone-750'
                    }`}
                  >
                    {COMMON_KEYS.map(k => (
                      <option key={k} value={k}>
                        {k} {song.originalKey === k ? '(Original)' : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.key && (
                    <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.key}</p>
                  )}
                </div>

                {/* BPM / Tempo */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Andamento / BPM
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bpm}
                    onChange={(e) => {
                      setBpm(e.target.value);
                      clearFieldError('bpm');
                    }}
                    placeholder="Ex: 72 (30–300)"
                    className={`w-full bg-stone-900 border rounded-xl px-3 py-2 text-stone-100 placeholder-stone-600 text-xs focus:outline-none focus:border-emerald-500 ${
                      fieldErrors.bpm ? 'border-rose-500' : 'border-stone-750'
                    }`}
                  />
                  {fieldErrors.bpm && (
                    <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.bpm}</p>
                  )}
                </div>

                {/* Compass / Time Signature */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Fórmula de Compasso
                  </label>
                  <input
                    type="text"
                    value={timeSignature}
                    onChange={(e) => {
                      setTimeSignature(e.target.value);
                      clearFieldError('timeSignature');
                    }}
                    placeholder="Ex: 4/4, 3/4, 6/8"
                    className={`w-full bg-stone-900 border rounded-xl px-3 py-2 text-stone-100 placeholder-stone-600 text-xs focus:outline-none focus:border-emerald-500 font-mono ${
                      fieldErrors.timeSignature ? 'border-rose-500' : 'border-stone-750'
                    }`}
                  />
                  {fieldErrors.timeSignature && (
                    <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.timeSignature}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Transpose Controls & Quick Arrangement Notes */}
              <div className="bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-stone-200">
                      Transposição Rápida de Cifra (+/- Semitons)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTransposeLyrics(-1)}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-button text-xs font-mono font-bold border border-stone-700 transition-colors"
                      title="Transpor -1 Semitom na cifra"
                    >
                      -1 Semitom
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTransposeLyrics(1)}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-button text-xs font-mono font-bold border border-stone-700 transition-colors"
                      title="Transpor +1 Semitom na cifra"
                    >
                      +1 Semitom
                    </button>
                  </div>
                </div>

                {/* Specific Arrangement Notes for this Schedule */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Observações de Arranjo / Instruções da Banda para este Dia
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Início solo no violão, repete o refrão 2x no final, solo de guitarras após verso 2"
                    className="w-full bg-stone-900 border border-stone-750 rounded-xl p-2.5 text-stone-100 placeholder-stone-600 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 3: Lyrics & Chords Textarea Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Letra e Cifra da Música para o Dia
                  </label>
                  
                  {/* Quick Helper Tags */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor(`[Tom: ${key}]`)}
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded text-[10px] font-mono border border-stone-700 rounded-button"
                    >
                      +[Tom]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[Introdução]\n[C] [G] [Am] [F]')}
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-mono border border-stone-700 rounded-button"
                    >
                      +[Intro]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[Verso 1]')}
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-mono border border-stone-700 rounded-button"
                    >
                      +[Verso]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[Refrão]')}
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-emerald-400 rounded text-[10px] font-mono border border-stone-700 font-bold rounded-button"
                    >
                      +[Refrão]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[Ponte]')}
                      className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-mono border border-stone-700 rounded-button"
                    >
                      +[Ponte]
                    </button>
                  </div>
                </div>

                <textarea
                  value={lyrics}
                  onChange={(e) => {
                    setLyrics(e.target.value);
                    clearFieldError('lyrics');
                  }}
                  rows={12}
                  placeholder="Escreva ou cole a letra e cifra no formato [C] Letra [G] aqui..."
                  className={`w-full bg-stone-950 border rounded-2xl p-4 text-stone-100 placeholder-stone-600 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    fieldErrors.lyrics ? 'border-rose-500' : 'border-stone-800'
                  }`}
                />
                {fieldErrors.lyrics ? (
                  <p className="text-[11px] text-rose-300">{fieldErrors.lyrics}</p>
                ) : (
                  <p className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>Dica: Coloque as cifras dentro de colchetes ex: <code className="bg-stone-900 px-1 py-0.5 rounded text-emerald-300">[C] Grandioso [G] és Tu</code></span>
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 space-y-4">
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-display font-bold text-emerald-400 text-base">
                    {song.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 font-mono">
                    <span>Tom: <strong className="text-stone-200">{key}</strong></span>
                    {bpm && <span>BPM: <strong className="text-stone-200">{bpm}</strong></span>}
                    {timeSignature && <span>Compasso: <strong className="text-stone-200">{timeSignature}</strong></span>}
                  </div>
                </div>
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2.5 py-1 rounded-lg font-bold font-mono">
                  Versão da Escala
                </span>
              </div>

              {notes && (
                <div className="p-3 bg-stone-900/60 border border-emerald-500/20 rounded-xl text-xs text-emerald-200">
                  <strong>Arranjo do Dia:</strong> {notes}
                </div>
              )}

              {/* Render Lyrics & Chords Sections */}
              <div className="space-y-4 pt-2">
                {parseLyricSections(lyrics).map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    {section.label && (
                      <LyricSectionHeading
                        label={section.label}
                        annotation={section.annotation}
                        className="text-xs font-bold font-mono text-emerald-400 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800 inline-block"
                      />
                    )}

                    <div className="space-y-2 pl-1">
                      {section.lines.map((line, lIdx) => (
                        <ChordLyricLine key={lIdx} line={line} showChords />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-button text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Versão para Esta Escala</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
