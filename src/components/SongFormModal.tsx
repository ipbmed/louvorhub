import React, { useMemo, useRef, useState } from 'react';
import { Song, Category, SongType, MediaLink, MediaLinkType } from '../types';
import { 
  X, 
  Save, 
  Eye, 
  Code, 
  Plus, 
  Sparkles, 
  Music, 
  Hash, 
  Tag, 
  HelpCircle,
  FileText,
  Trash2,
  Youtube,
  Disc,
  Radio,
  Volume2,
  ExternalLink,
  Link as LinkIcon,
  MessageSquareText,
} from 'lucide-react';
import {
  parseLyricSections,
  filterSectionsForView,
  LYRIC_SECTION_DEFS,
} from '../utils/chordTransposer';
import { sectionMarkerToken } from '../utils/lyricSections';
import { ChordLyricLine } from './ChordLyricLine';
import { LyricSectionHeading } from './LyricSectionHeading';
import { getCombinedMediaLinks, detectMediaType } from '../utils/mediaUtils';
import { validateBpmField, validateTimeSignatureField } from '@/lib/songVersionFields';
interface SongFormModalProps {
  songToEdit?: Song | null;
  categories: Category[];
  existingNumbers: number[];
  onSave: (song: Song) => void | Promise<void>;
  onClose: () => void;
}

const MUSICAL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Dm', 'Em'];

type SongFormField =
  | 'title'
  | 'lyrics'
  | 'number'
  | 'bpm'
  | 'timeSignature'
  | `media:${string}`;

type SongFormErrors = Partial<Record<SongFormField, string>>;

function validateMediaUrl(url: string): string | undefined {
  const raw = url.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'A URL deve começar com http:// ou https://';
    }
  } catch {
    return 'Informe uma URL válida.';
  }
  return undefined;
}

function computeSongFormErrors(input: {
  songType: SongType;
  title: string;
  lyrics: string;
  number: number;
  bpm: string;
  timeSignature: string;
  existingNumbers: number[];
  songToEditNumber?: number | null;
  mediaLinks: MediaLink[];
}): SongFormErrors {
  const errors: SongFormErrors = {};

  if (!input.title.trim()) {
    errors.title = 'Informe o título.';
  }

  if (!input.lyrics.replace(/^\n+/, '').replace(/\n+$/, '').trim()) {
    errors.lyrics = 'Informe a letra da música.';
  }

  if (input.songType === 'hino') {
    if (!input.number || Number.isNaN(input.number) || input.number < 1) {
      errors.number = 'Informe um número válido (≥ 1).';
    } else {
      const taken =
        input.existingNumbers.includes(input.number) &&
        !(input.songToEditNumber != null && Number(input.songToEditNumber) === Number(input.number));
      if (taken) {
        errors.number = `O número #${input.number} já está em uso.`;
      }
    }
  }

  const bpmResult = validateBpmField(input.bpm);
  if (bpmResult.error) errors.bpm = bpmResult.error;

  const timeResult = validateTimeSignatureField(input.timeSignature);
  if (timeResult.error) errors.timeSignature = timeResult.error;

  for (const link of input.mediaLinks) {
    const urlError = validateMediaUrl(link.url);
    if (urlError) errors[`media:${link.id}`] = urlError;
  }

  return errors;
}

export const SongFormModal: React.FC<SongFormModalProps> = ({
  songToEdit,
  existingNumbers,
  onSave,
  onClose,
}) => {
  // Suggest next available Song number if creating new
  const nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;

  const [songType, setSongType] = useState<SongType>(
    songToEdit?.songType || (songToEdit?.number ? 'hino' : 'cantico') || 'hino'
  );
  const [hymnal, setHymnal] = useState<string>(songToEdit?.hymnal || 'Novo Cântico');
  const [number, setNumber] = useState<number>(songToEdit?.number || nextNumber);
  const [title, setTitle] = useState<string>(songToEdit?.title || '');
  const [subtitle, setSubtitle] = useState<string>(songToEdit?.subtitle || '');
  const [originalKey, setOriginalKey] = useState<string>(songToEdit?.originalKey || 'C');
  const [timeSignature, setTimeSignature] = useState<string>(songToEdit?.timeSignature || '4/4');
  const [bpm, setBpm] = useState<string>(
    songToEdit?.bpm != null ? String(songToEdit.bpm) : '',
  );
  const [author, setAuthor] = useState<string>(songToEdit?.author || '');
  const [composer, setComposer] = useState<string>(
    songToEdit?.composer || songToEdit?.composition || '',
  );
  const [instructions, setInstructions] = useState<string>(songToEdit?.instructions || '');
  const [reviewed, setReviewed] = useState<boolean>(Boolean(songToEdit?.reviewed));
  
  // Media Links state - initialized with existing or default preset empty links
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>(() => {
    if (songToEdit) {
      // Em edição: só os links reais (lista vazia = sem links, não recriar YouTube/Spotify vazios)
      return getCombinedMediaLinks(songToEdit);
    }
    return [
      { id: `ml-${Date.now()}-1`, type: 'youtube', title: 'YouTube', url: '' },
      { id: `ml-${Date.now()}-2`, type: 'spotify', title: 'Spotify', url: '' },
    ];
  });

  const [lyrics, setLyrics] = useState<string>(songToEdit?.lyrics || '');
  const [tagsStr, setTagsStr] = useState<string>(songToEdit?.tags?.join(', ') || '');

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<SongFormField, boolean>>>({});
  const [showLyricsHelp, setShowLyricsHelp] = useState(false);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldErrors = useMemo(
    () =>
      computeSongFormErrors({
        songType,
        title,
        lyrics,
        number,
        bpm,
        timeSignature,
        existingNumbers,
        songToEditNumber: songToEdit?.number,
        mediaLinks,
      }),
    [
      songType,
      title,
      lyrics,
      number,
      bpm,
      timeSignature,
      existingNumbers,
      songToEdit?.number,
      mediaLinks,
    ],
  );

  const isFormValid = Object.keys(fieldErrors).length === 0;

  const markTouched = (field: SongFormField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const showFieldError = (field: SongFormField) =>
    Boolean(touched[field] && fieldErrors[field]);

  const fieldBorderClass = (field: SongFormField) =>
    showFieldError(field)
      ? 'border-rose-500 focus:ring-rose-500/40'
      : 'border-stone-800 focus:ring-emerald-500/50';

  // Media links list handlers
  const handleAddMediaLink = (type: MediaLinkType = 'youtube') => {
    const defaultTitle = 
      type === 'youtube' ? 'YouTube' :
      type === 'ytmusic' ? 'YouTube Music' :
      type === 'spotify' ? 'Spotify' : 'Outro Link';
    setMediaLinks(prev => [
      ...prev,
      { id: `ml-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, type, title: defaultTitle, url: '' }
    ]);
  };

  const handleUpdateMediaLink = (id: string, field: keyof MediaLink, value: string) => {
    setMediaLinks(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'url' && value.trim()) {
          const autoType = detectMediaType(value);
          if (autoType !== 'other') {
            updated.type = autoType;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveMediaLink = (id: string) => {
    setMediaLinks(prev => prev.filter(item => item.id !== id));
  };

  // Insert helper tags into lyrics textarea (at cursor when possible)
  const insertTextAtCursor = (textToInsert: string) => {
    const el = lyricsTextareaRef.current;
    if (!el) {
      setLyrics((prev) => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + textToInsert);
      return;
    }

    const start = el.selectionStart ?? lyrics.length;
    const end = el.selectionEnd ?? start;
    const before = lyrics.slice(0, start);
    const after = lyrics.slice(end);
    const needsLeadingNewline =
      before.length > 0 && !before.endsWith('\n') && textToInsert.startsWith('[');
    const insert = (needsLeadingNewline ? '\n' : '') + textToInsert;
    const next = before + insert + after;
    const cursor = before.length + insert.length;
    setLyrics(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const insertSection = (key: string) => {
    insertTextAtCursor(`${sectionMarkerToken(key)}\n`);
  };

  const insertComment = () => {
    insertTextAtCursor('### ');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // Marca campos obrigatórios/relevantes para exibir erros se tentar salvar
    const nextTouched: Partial<Record<SongFormField, boolean>> = {
      ...touched,
      title: true,
      lyrics: true,
      bpm: true,
      timeSignature: true,
    };
    if (songType === 'hino') nextTouched.number = true;
    for (const link of mediaLinks) {
      if (link.url.trim()) nextTouched[`media:${link.id}`] = true;
    }
    setTouched(nextTouched);

    if (!isFormValid) {
      setErrorMsg('Corrija os campos inválidos antes de salvar.');
      setActiveTab('editor');
      return;
    }

    const bpmValue = validateBpmField(bpm).value;
    const tagsArr = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    // Filter valid media links
    const cleanedMediaLinks = mediaLinks
      .map(l => ({ ...l, url: l.url.trim(), title: l.title?.trim() || undefined }))
      .filter(l => l.url.length > 0);

    // Derive legacy backward-compatible fields
    const firstYoutube = cleanedMediaLinks.find(l => l.type === 'youtube' || l.type === 'ytmusic')?.url;
    const firstSpotify = cleanedMediaLinks.find(l => l.type === 'spotify')?.url;
    const firstOther = cleanedMediaLinks.find(l => l.type === 'other')?.url;
    const composerValue = composer.trim() || undefined;

    // Se o nome do hinário mudou, não reenviar hymnalId — resolve pelo nome no serviço
    const hymnalUnchanged =
      Boolean(songToEdit?.hymnalId) && (hymnal || 'Novo Cântico') === (songToEdit?.hymnal || 'Novo Cântico');

    const songObj: Song = {
      id: songToEdit?.id || `${songType}-${Date.now()}`,
      songType,
      hymnalId: songType === 'hino' && hymnalUnchanged ? songToEdit?.hymnalId : null,
      hymnal: songType === 'hino' ? (hymnal || 'Novo Cântico') : undefined,
      number: songType === 'hino' ? Number(number) : null,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      originalKey: originalKey.trim() || undefined,
      timeSignature: timeSignature.trim() || undefined,
      bpm: bpmValue,
      author: author.trim() || undefined,
      composer: composerValue,
      composition: composerValue,
      instructions: instructions.trim() || undefined,
      reviewed,
      youtubeUrl: firstYoutube,
      spotifyUrl: firstSpotify,
      otherMediaUrl: firstOther,
      mediaLinks: cleanedMediaLinks,
      lyrics: lyrics.replace(/^\n+/, '').replace(/\n+$/, ''),
      tags: tagsArr,
      createdAt: songToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setErrorMsg('');
    try {
      await onSave(songObj);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar música');
    } finally {
      setSaving(false);
    }
  };

  const parsedPreviewSections = filterSectionsForView(parseLyricSections(lyrics), 'chords');

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 animate-in fade-in duration-200">
      
      <div className="bg-stone-900 w-full h-[100dvh] flex flex-col overflow-hidden text-stone-100 relative">
        
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 sm:px-7 sm:py-4 lg:px-8 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/30 shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-display font-bold text-emerald-100 tracking-tight truncate">
                {songToEdit 
                  ? (songToEdit.number ? `Editar Hino #${songToEdit.number}` : `Editar Cântico "${songToEdit.title}"`) 
                  : 'Cadastrar Nova Música'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Editor vs Preview Mode tabs */}
            <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-button text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'editor' ? 'bg-emerald-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-button text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'preview' ? 'bg-emerald-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pré-visualizar</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="shrink-0 bg-rose-950/60 border-b border-rose-800/60 py-2.5 text-xs text-rose-300 px-4 sm:px-5">
            {errorMsg}
          </div>
        )}

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col text-xs sm:text-sm">
          <div className={`flex-1 min-h-0 px-5 py-4 sm:px-7 sm:py-5 lg:pl-8 lg:pr-6 lg:py-5 ${activeTab === 'editor' ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'}`}>
          
          {activeTab === 'editor' ? (
            <div className="min-h-full lg:h-full flex flex-col lg:grid lg:grid-cols-[minmax(280px,min(420px,36vw))_1fr] xl:grid-cols-[minmax(320px,min(480px,32vw))_1fr] lg:gap-5 xl:gap-6 lg:min-h-0">
              {/* Coluna metadados — padding interno evita cortar o focus:ring no overflow */}
              <div className="space-y-4 px-1.5 py-1 lg:overflow-y-auto lg:pl-1 lg:pr-3 lg:py-1 lg:min-h-0 lg:max-h-full">
              {/* Type Selection: Hino vs Cântico */}
              <div className="bg-stone-950/80 border border-stone-800 px-3.5 py-3.5 sm:px-4 sm:py-4 rounded-xl space-y-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-semibold text-stone-200 text-xs uppercase tracking-wider font-mono shrink-0">
                    Tipo
                  </span>
                  <p className="text-[11px] text-stone-400 text-right min-w-0">
                    {songType === 'hino' 
                      ? 'Hinário oficial com numeração.' 
                      : 'Música avulsa / contemporânea.'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 p-1 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => setSongType('hino')}
                    className={`flex-1 px-2 py-1.5 rounded-button font-bold text-xs transition-all ${
                      songType === 'hino'
                        ? 'bg-emerald-500 text-stone-950 shadow-md'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Hino
                  </button>
                  <button
                    type="button"
                    onClick={() => setSongType('cantico')}
                    className={`flex-1 px-2 py-1.5 rounded-button font-bold text-xs transition-all ${
                      songType === 'cantico'
                        ? 'bg-teal-500 text-stone-950 shadow-md'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Cântico
                  </button>
                </div>
              </div>

              {songType === 'hino' && (
                <div className="grid grid-cols-1 min-[380px]:grid-cols-[1fr_5.5rem] gap-3">
                  <div className="min-w-0">
                    <label className="block text-stone-400 font-semibold mb-1.5">
                      Hinário
                    </label>
                    <select
                      value={hymnal}
                      onChange={(e) => setHymnal(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="Novo Cântico">Novo Cântico</option>
                      <option value="Cantor Cristão">Cantor Cristão</option>
                      <option value="Harpa Cristã">Harpa Cristã</option>
                      <option value="Hinário Evangélico">Hinário Evangélico</option>
                      <option value="Outro Hinário">Outro Hinário</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-400 font-semibold mb-1.5">
                      Nº
                    </label>
                    <input
                      type="number"
                      required={songType === 'hino'}
                      value={number || ''}
                      onChange={(e) => setNumber(Number(e.target.value))}
                      onBlur={() => markTouched('number')}
                      className={`w-full bg-stone-950 border rounded-xl px-3 py-2.5 font-mono font-bold text-emerald-300 focus:outline-none focus:ring-2 ${fieldBorderClass('number')}`}
                    />
                    {showFieldError('number') && (
                      <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.number}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => markTouched('title')}
                    placeholder={songType === 'hino' ? 'Ex: Grandioso És Tu' : 'Ex: Aclame ao Senhor'}
                    className={`w-full bg-stone-950 border rounded-xl px-3 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 ${fieldBorderClass('title')}`}
                  />
                  {showFieldError('title') && (
                    <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Tom / Compasso / BPM — 3 cols se couber, senão empilha */}
              <div className="grid grid-cols-2 min-[420px]:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    Tom
                  </label>
                  <select
                    value={originalKey}
                    onChange={(e) => setOriginalKey(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {MUSICAL_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    Compasso
                  </label>
                  <input
                    type="text"
                    value={timeSignature}
                    onChange={(e) => setTimeSignature(e.target.value)}
                    onBlur={() => markTouched('timeSignature')}
                    placeholder="4/4"
                    className={`w-full bg-stone-950 border rounded-xl px-3 py-2.5 text-stone-100 font-mono focus:outline-none focus:ring-2 ${fieldBorderClass('timeSignature')}`}
                  />
                  {showFieldError('timeSignature') && (
                    <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.timeSignature}</p>
                  )}
                </div>

                <div className="col-span-2 min-[420px]:col-span-1">
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    BPM
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    onBlur={() => markTouched('bpm')}
                    placeholder="72"
                    className={`w-full bg-stone-950 border rounded-xl px-3 py-2.5 text-stone-100 font-mono focus:outline-none focus:ring-2 ${fieldBorderClass('bpm')}`}
                  />
                  {showFieldError('bpm') && (
                    <p className="mt-1 text-[11px] text-rose-300">{fieldErrors.bpm}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="min-w-0">
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Letra"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-stone-400 font-semibold mb-1.5">
                    Compositor
                  </label>
                  <input
                    type="text"
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Melodia"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-1.5">
                  Instruções / Observações
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex.: Entrada instrumental, solo no refrão…"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Links de mídia — layout empilhado (lateral estreita) */}
              <div className="bg-stone-950/90 border border-stone-800 px-3.5 py-3.5 sm:px-4 sm:py-4 rounded-xl space-y-3">
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-emerald-300 block text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      Links de mídia
                    </span>
                    <span className="text-[10px] text-stone-400">
                      YouTube, Spotify, MP3…
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAddMediaLink('youtube')}
                      className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 rounded-button text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-red-400" />
                      <Youtube className="w-3 h-3 text-red-400" />
                      <span>YT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMediaLink('ytmusic')}
                      className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-button text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-rose-400" />
                      <Music className="w-3 h-3 text-rose-400" />
                      <span>YT Music</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMediaLink('spotify')}
                      className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-button text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <Disc className="w-3 h-3 text-emerald-400" />
                      <span>Spotify</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMediaLink('other')}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-button text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-stone-400" />
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                      <span>Outro</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-0.5">
                  {mediaLinks.length === 0 ? (
                    <div className="p-3 text-center border border-dashed border-stone-800 rounded-xl text-stone-500 text-[11px] italic">
                      Nenhum link. Use os botões acima.
                    </div>
                  ) : (
                    mediaLinks.map((link) => (
                      <div
                        key={link.id}
                        className="bg-stone-900 border border-stone-800 p-2 rounded-xl space-y-1.5"
                      >
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                          <select
                            value={link.type}
                            onChange={(e) => handleUpdateMediaLink(link.id, 'type', e.target.value as MediaLinkType)}
                            className="min-w-0 bg-stone-950 border border-stone-750 rounded-lg px-2 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 font-medium"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="ytmusic">YT Music</option>
                            <option value="spotify">Spotify</option>
                            <option value="other">Outro</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Rótulo"
                            value={link.title || ''}
                            onChange={(e) => handleUpdateMediaLink(link.id, 'title', e.target.value)}
                            className="min-w-0 bg-stone-950 border border-stone-750 rounded-lg px-2 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMediaLink(link.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-button transition-colors shrink-0"
                            title="Remover este link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="url"
                          placeholder={
                            link.type === 'youtube'
                              ? 'https://youtube.com/...'
                              : link.type === 'ytmusic'
                              ? 'https://music.youtube.com/...'
                              : link.type === 'spotify'
                              ? 'https://open.spotify.com/...'
                              : 'https://...'
                          }
                          value={link.url}
                          onChange={(e) => handleUpdateMediaLink(link.id, 'url', e.target.value)}
                          onBlur={() => markTouched(`media:${link.id}`)}
                          className={`w-full bg-stone-950 border rounded-lg px-2 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none font-mono ${
                            showFieldError(`media:${link.id}`)
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-stone-750 focus:border-emerald-500'
                          }`}
                        />
                        {showFieldError(`media:${link.id}`) && (
                          <p className="text-[11px] text-rose-300">{fieldErrors[`media:${link.id}`]}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tags string */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1.5">
                  Tags / Palavras-chave
                </label>
                <input
                  type="text"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="Ex: Criação, Exaltação, Majestade, Páscoa"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <label className="flex items-start gap-3 bg-stone-950/80 border border-stone-800 rounded-xl px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                  className="mt-0.5 rounded border-stone-600 bg-stone-900 text-emerald-500 focus:ring-emerald-500/40"
                />
                <span className="min-w-0">
                  <span className="block text-stone-200 font-semibold text-xs">Cifra revisada</span>
                  <span className="block text-[11px] text-stone-400 mt-0.5">
                    Marque após conferir a letra e os acordes. Sem isso, o modo cifra mostra um aviso.
                  </span>
                </span>
              </label>
              </div>

              {/* Coluna letra — 100% do espaço restante */}
              <div className="mt-4 lg:mt-0 flex-1 min-h-0 flex flex-col lg:border-l lg:border-stone-800 lg:pl-5 xl:pl-6">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <label className="block text-stone-400 font-semibold">
                      Letra e cifras
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLyricsHelp(true)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-300/90 hover:text-emerald-200 font-semibold"
                      title="Ajuda do editor de letra"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Ajuda
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[C] ')}
                      className="px-2 py-1 bg-stone-800 text-emerald-300 rounded font-mono text-xs hover:bg-stone-700 rounded-button"
                    >
                      + [C]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[G] ')}
                      className="px-2 py-1 bg-stone-800 text-emerald-300 rounded font-mono text-xs hover:bg-stone-700 rounded-button"
                    >
                      + [G]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[Am] ')}
                      className="px-2 py-1 bg-stone-800 text-emerald-300 rounded font-mono text-xs hover:bg-stone-700 rounded-button"
                    >
                      + [Am]
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('[F] ')}
                      className="px-2 py-1 bg-stone-800 text-emerald-300 rounded font-mono text-xs hover:bg-stone-700 rounded-button"
                    >
                      + [F]
                    </button>
                  </div>
                </div>

                <div className="mb-2 shrink-0 rounded-xl border border-stone-800 bg-stone-950/70 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-stone-500">
                      Partes da música
                    </span>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('---\n')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-button text-[11px] font-semibold bg-stone-800 text-stone-200 border border-stone-700 hover:border-emerald-500/40 hover:text-emerald-200"
                      title="Quebra de página no telão (---)"
                    >
                      --- Página
                    </button>
                    <button
                      type="button"
                      onClick={insertComment}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-button text-[11px] font-semibold bg-amber-500/10 text-amber-200 border border-amber-500/30 hover:bg-amber-500/20"
                      title="Inserir comentário (###)"
                    >
                      <MessageSquareText className="w-3 h-3" />
                      Comentário
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {LYRIC_SECTION_DEFS.map((def) => (
                      <button
                        key={def.key}
                        type="button"
                        onClick={() => insertSection(def.key)}
                        title={def.description}
                        className="px-2 py-1 rounded-button text-[11px] font-semibold border border-stone-700 bg-stone-900 text-stone-200 hover:border-emerald-500/40 hover:text-emerald-200 hover:bg-emerald-500/10"
                      >
                        {def.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-stone-500 px-0.5 leading-relaxed">
                    No modo letra aparecem só estrofe, pré-refrão, refrão, pós-refrão, ponte e finalização.
                    Intro, solo e comentários ficam no modo cifra.
                  </p>
                </div>

                <textarea
                  ref={lyricsTextareaRef}
                  required
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  onBlur={() => markTouched('lyrics')}
                  placeholder={`[INTRO]
[C]  [G]  [Am]  [F]

[ESTROFE]
[C]Senhor meu Deus, quando eu [F]maravilhado
Fico a [C]pensar nas [G7]obras de tuas [C]mãos...

[REFRAO]
Então mi[C]nh'alma [F]canta a ti, Se[C]nhor:
"Grandioso [G7] és Tu!"

### Subir 1 tom no último refrão`}
                  className={`w-full flex-1 min-h-[50vh] lg:min-h-0 resize-y lg:resize-none bg-stone-950 border rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 font-mono text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 leading-relaxed ${fieldBorderClass('lyrics')}`}
                />
                {showFieldError('lyrics') && (
                  <p className="mt-1.5 text-[11px] text-rose-300 shrink-0">{fieldErrors.lyrics}</p>
                )}
              </div>
            </div>
          ) : (
            /* Live Formatted Preview Tab */
            <div className="space-y-5 max-w-4xl mx-auto w-full px-1">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                  {songType === 'hino' ? `#${number} · ${hymnal}` : 'Cântico'}
                  {originalKey ? ` · ${originalKey}` : ''}
                  {bpm ? ` · ${bpm} BPM` : ''}
                </span>
                <h2 className="text-2xl font-serif font-bold text-emerald-100 mt-1">
                  {title || 'Título do Hino'}
                </h2>
                {subtitle && <p className="text-xs text-stone-400 italic font-serif">{subtitle}</p>}
              </div>

              <div className="space-y-3">
                {parsedPreviewSections.map((sec, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      sec.type === 'comment'
                        ? 'bg-amber-950/20 border-amber-500/30 border-dashed'
                        : sec.type === 'chorus'
                          ? 'bg-emerald-950/30 border-emerald-500/50'
                          : 'bg-stone-950 border-stone-800'
                    }`}
                  >
                    <LyricSectionHeading
                      label={sec.label}
                      annotation={sec.annotation}
                      className={`text-xs font-mono font-bold block mb-2 ${
                        sec.type === 'comment' ? 'text-amber-300' : 'text-emerald-400'
                      }`}
                    />
                    <div
                      className={`space-y-2.5 text-base ${
                        sec.type === 'comment'
                          ? 'italic text-amber-100/80'
                          : 'font-mono font-normal tracking-normal'
                      }`}
                    >
                      {sec.lines.map((line, lIdx) =>
                        sec.type === 'comment' ? (
                          <p key={lIdx}>{line || '\u00A0'}</p>
                        ) : (
                          <ChordLyricLine key={lIdx} line={line} showChords />
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          {/* Form Actions Footer — fixo na base */}
          <div className="shrink-0 px-5 py-3.5 sm:px-7 sm:py-4 lg:px-8 border-t border-stone-800 bg-stone-900/95 flex items-center justify-between gap-3">
            <p className="text-[11px] text-stone-500 min-w-0 truncate">
              {!isFormValid ? 'Preencha os campos obrigatórios para salvar.' : '\u00A0'}
            </p>
            <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 bg-stone-800 text-stone-300 rounded-button font-semibold hover:bg-stone-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !isFormValid}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando…' : songToEdit ? 'Salvar Alterações' : 'Salvar'}</span>
            </button>
            </div>
          </div>

        </form>

        {showLyricsHelp && (
          <div className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="lyrics-help-title"
              className="w-full max-w-2xl max-h-[85dvh] overflow-hidden flex flex-col bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl"
            >
              <div className="shrink-0 px-5 py-4 border-b border-stone-800 flex items-center justify-between gap-3">
                <div>
                  <h3 id="lyrics-help-title" className="text-base font-display font-bold text-emerald-100">
                    Editor de letra
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Use as ferramentas para marcar as partes da música. Cifras ficam em colchetes na própria linha.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLyricsHelp(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-stone-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-950 text-stone-400 font-mono uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Chave</th>
                        <th className="px-3 py-2.5 font-semibold">Nome</th>
                        <th className="px-3 py-2.5 font-semibold">Descrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {LYRIC_SECTION_DEFS.map((def) => (
                        <tr key={def.key} className="align-top">
                          <td className="px-3 py-2.5 font-mono text-emerald-300 whitespace-nowrap">
                            [{def.key}]
                          </td>
                          <td className="px-3 py-2.5 text-stone-200 font-semibold whitespace-nowrap">
                            {def.name}
                            {!def.showInLyrics && (
                              <span className="ml-1.5 text-[10px] font-normal text-stone-500">
                                (só cifra)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-stone-400 leading-relaxed">
                            {def.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3.5 py-3 text-xs text-amber-100/90 leading-relaxed">
                  <p className="font-semibold text-amber-200 mb-1">Comentários</p>
                  <p>
                    Use <span className="font-mono text-amber-100">###</span> no início da linha para
                    anotações (arranjo, tom, cues). Aparecem no modo cifra e na pré-visualização; não
                    entram no modo letra nem na projeção.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-800 bg-stone-950/60 px-3.5 py-3 text-xs text-stone-400 leading-relaxed space-y-1.5">
                  <p className="font-semibold text-stone-300">Dicas</p>
                  <p>
                    • Cada marcador fica em uma linha, antes do trecho. O refrão não é numerado.
                  </p>
                  <p>
                    • Quebra de página no telão: linha só com{' '}
                    <span className="font-mono text-emerald-300">---</span> (também vale{' '}
                    <span className="font-mono text-emerald-300">//</span>).
                  </p>
                  <p>
                    • Anotação após o marcador (visível na letra e na cifra):{' '}
                    <span className="font-mono text-emerald-300">[REFRAO]:2x</span> →{' '}
                    <span className="text-stone-200">REFRÃO: 2x</span>
                  </p>
                  <p>
                    • Cifras: <span className="font-mono text-emerald-300">[C]</span>,{' '}
                    <span className="font-mono text-emerald-300">[Am7]</span>,{' '}
                    <span className="font-mono text-emerald-300">[G/B]</span> dentro da linha da letra.
                  </p>
                  <p>
                    • Modo letra: estrofe, pré-refrão, refrão, pós-refrão, ponte e finalização.
                  </p>
                  <p>
                    • Modo cifra: todas as partes + comentários.
                  </p>
                </div>
              </div>

              <div className="shrink-0 px-5 py-3.5 border-t border-stone-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowLyricsHelp(false)}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
