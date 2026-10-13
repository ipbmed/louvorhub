import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  GripVertical,
  HelpCircle,
  Layers,
  Loader2,
  Music,
  Plus,
  Printer,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import type { Liturgy, LiturgyItem, LiturgyItemType, Song } from '../types';
import { useConfirm } from '@/contexts/ConfirmProvider';
import {
  LITURGY_MARKDOWN_EXAMPLE,
  LITURGY_MARKDOWN_HELP,
  parseLiturgyMarkdown,
} from '@/utils/liturgyMarkdown';
import { LiturgySongField, liturgySongLabel } from './LiturgySongField';
import { ActionButton, Field, Input, Select, Textarea, cn } from './ui';

const ITEM_TYPES: { value: LiturgyItemType; emoji: string; label: string }[] = [
  { value: 'hymn', emoji: '🎵', label: 'Música' },
  { value: 'prayer', emoji: '🙏', label: 'Oração' },
  { value: 'reading', emoji: '📖', label: 'Leitura bíblica' },
  { value: 'sermon', emoji: '✝️', label: 'Pregação' },
  { value: 'offertory', emoji: '💸', label: 'Dízimos e ofertas' },
  { value: 'supper', emoji: '🍷', label: 'Ceia do Senhor' },
  { value: 'benediction', emoji: '🕊️', label: 'Bênção final' },
  { value: 'custom', emoji: '📌', label: 'Outro momento' },
];

const typeInfo = (type: LiturgyItemType) => ITEM_TYPES.find((t) => t.value === type) ?? ITEM_TYPES[ITEM_TYPES.length - 1];

const DEFAULT_ITEMS: Omit<LiturgyItem, 'id' | 'order'>[] = [
  { type: 'reading', title: 'Prelúdio e oração silenciosa', duration: '3 min' },
  { type: 'prayer', title: 'Oração de invocação e leitura bíblica', duration: '5 min' },
  { type: 'hymn', title: 'Cântico congregacional', duration: '5 min' },
  { type: 'sermon', title: 'Pregação da Palavra', duration: '35 min' },
  { type: 'benediction', title: 'Bênção apostólica e tríplice amém', duration: '3 min' },
];

type Draft = Pick<Liturgy, 'items'>;

const toDraft = (l: Liturgy): Draft => ({
  items: l.items.map((i) => ({ ...i })),
});

export interface LiturgyServiceInfo {
  theme?: string;
  bibleVerse?: string;
  preacher?: string;
  leader?: string;
}

const renumber = (items: LiturgyItem[]) => items.map((item, i) => ({ ...item, order: i + 1 }));

const newItemId = () => `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface LiturgyItemRowProps {
  item: LiturgyItem;
  index: number;
  songs: Song[];
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LiturgyItem>) => void;
  onMove: (delta: -1 | 1) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onSelectSong?: (song: Song) => void;
}

/** Momento da liturgia: linha compacta que expande para edição ao tocar. */
const LiturgyItemRow: React.FC<LiturgyItemRowProps> = ({
  item,
  index,
  songs,
  expanded,
  onToggle,
  onChange,
  onMove,
  onDragEnd,
  onRemove,
  onSelectSong,
}) => {
  const dragControls = useDragControls();
  const linkedSong = item.songId ? songs.find((s) => s.id === item.songId) : undefined;
  const info = typeInfo(item.type);
  const isHymn = item.type === 'hymn';
  const title = isHymn && linkedSong ? liturgySongLabel(linkedSong) : item.title.trim();

  const secondary: React.ReactNode[] = [];
  if (isHymn && !linkedSong && title) secondary.push('Fora do catálogo');
  if (item.details) secondary.push(item.details);
  if (item.responsible) secondary.push(item.responsible);

  return (
    <Reorder.Item
      as="li"
      value={item.id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.01, boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)', zIndex: 10 }}
      className={cn('relative bg-surface', expanded && 'bg-surface-2/50')}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-3 sm:pr-4 py-2">
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              onMove(e.key === 'ArrowUp' ? -1 : 1);
            }
          }}
          style={{ touchAction: 'none' }}
          className="w-7 h-9 shrink-0 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2 cursor-grab active:cursor-grabbing"
          aria-label={`Arrastar momento ${index + 1} (setas para mover)`}
          title="Arraste para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 min-w-0 flex items-center gap-3 text-left py-1 rounded-lg"
        >
          <span className="w-6 shrink-0 text-center text-[11px] font-bold text-fg-subtle tabular-nums">
            {index + 1}
          </span>
          <span
            className="w-9 h-9 shrink-0 rounded-xl bg-brand-soft flex items-center justify-center text-base"
            aria-hidden
          >
            {info.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('block text-sm font-semibold truncate', title ? 'text-fg' : 'text-fg-subtle italic')}>
              {title || info.label}
            </span>
            {secondary.length > 0 && (
              <span className="block text-xs text-fg-muted truncate">
                {secondary.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && ' · '}
                    {part}
                  </React.Fragment>
                ))}
              </span>
            )}
          </span>
          {item.duration && (
            <span className="hidden sm:inline shrink-0 text-[11px] font-semibold text-fg-subtle tabular-nums">
              {item.duration}
            </span>
          )}
        </button>
        {linkedSong && onSelectSong && !expanded && (
          <button
            type="button"
            onClick={() => onSelectSong(linkedSong)}
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-fg-subtle hover:text-brand-text hover:bg-surface-2"
            aria-label={`Abrir ${linkedSong.title}`}
            title="Abrir música"
          >
            <Music className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-9 shrink-0 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2"
          aria-label={expanded ? 'Fechar edição' : `Editar momento ${index + 1}`}
          title={expanded ? 'Fechar edição' : 'Editar'}
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 sm:pl-[5.75rem] space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap gap-2">
            <Select
              value={item.type}
              onChange={(e) => {
                const type = e.target.value as LiturgyItemType;
                onChange(type === 'hymn' ? { type } : { type, songId: undefined });
              }}
              aria-label="Tipo do momento"
              className="w-auto h-9 py-0 text-sm"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </Select>
            {isHymn ? (
              <LiturgySongField
                songs={songs}
                title={item.title}
                songId={item.songId}
                onChange={onChange}
                autoFocus={!item.title && !item.songId}
                className="flex-1 min-w-[12rem]"
              />
            ) : (
              <Input
                value={item.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Título do momento"
                aria-label="Título do momento"
                autoFocus={!item.title}
                className="w-auto flex-1 min-w-[12rem] h-9 py-0 text-sm font-semibold"
              />
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={item.responsible || ''}
              onChange={(e) => onChange({ responsible: e.target.value || undefined })}
              placeholder="Responsável"
              aria-label="Responsável"
              className="h-9 py-0 text-sm"
            />
            <Input
              value={item.details || ''}
              onChange={(e) => onChange({ details: e.target.value || undefined })}
              placeholder={isHymn ? 'Observação (ex.: estrofes 1 e 3)' : 'Detalhes (ex.: Salmo 23)'}
              aria-label="Detalhes"
              className="h-9 py-0 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            {linkedSong && onSelectSong && (
              <ActionButton variant="light" icon={Music} onClick={() => onSelectSong(linkedSong)}>
                Abrir música
              </ActionButton>
            )}
            <div className="flex-1" />
            <ActionButton variant="danger" icon={Trash2} collapseLabel onClick={onRemove} title="Remover momento">
              Remover
            </ActionButton>
            <ActionButton variant="secondary" icon={Check} onClick={onToggle}>
              Concluir
            </ActionButton>
          </div>
        </div>
      )}
    </Reorder.Item>
  );
};

interface EventLiturgyPanelProps {
  liturgy: Liturgy;
  songs: Song[];
  churchName?: string;
  /** Dados do culto (pertencem ao evento), usados no boletim. */
  serviceInfo?: LiturgyServiceInfo;
  /** `silent`: salvamento automático, sem overlay de carregamento nem toast de sucesso. */
  onSave: (liturgy: Liturgy, opts?: { silent?: boolean }) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onSelectSong?: (song: Song) => void;
}

/** Liturgia do evento editada no lugar: cada alteração concluída é salva automaticamente. */
export const EventLiturgyPanel: React.FC<EventLiturgyPanelProps> = ({
  liturgy,
  songs,
  churchName,
  serviceInfo,
  onSave,
  onDelete,
  onSelectSong,
}) => {
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft>(() => toDraft(liturgy));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const [importOpen, setImportOpen] = useState(false);
  const [importHelp, setImportHelp] = useState(false);
  const [importText, setImportText] = useState(LITURGY_MARKDOWN_EXAMPLE);
  const [importError, setImportError] = useState('');

  const [presenting, setPresenting] = useState(false);
  const [slide, setSlide] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Salvar recria os itens no banco (novos ids): ao recarregar, o momento aberto é mantido pela posição.
  useEffect(() => {
    if (dirty) return;
    const next = toDraft(liturgy);
    const prevIds = draftRef.current.items.map((i) => i.id);
    setExpandedId((cur) => {
      if (!cur) return cur;
      const index = prevIds.indexOf(cur);
      return index >= 0 ? (next.items[index]?.id ?? null) : null;
    });
    draftRef.current = next;
    setDraft(next);
  }, [liturgy, dirty]);

  const updateDraft = (fn: (d: Draft) => Draft) => {
    const next = fn(draftRef.current);
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setDirty(true);
  };

  const toLiturgy = (d: Draft): Liturgy => ({
    ...liturgy,
    ...d,
    items: d.items.map((i) => {
      const song = i.type === 'hymn' && i.songId ? songs.find((s) => s.id === i.songId) : undefined;
      return { ...i, title: song?.title || i.title.trim() || typeInfo(i.type).label };
    }),
  });

  /** Salva o rascunho atual, se houver alterações; chamadas seguidas são enfileiradas. */
  const commit = () => {
    saveChain.current = saveChain.current.then(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSaving(true);
      setSaveFailed(false);
      try {
        await onSave(toLiturgy(draftRef.current), { silent: true });
        if (!dirtyRef.current) setDirty(false);
      } catch {
        dirtyRef.current = true;
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    });
    return saveChain.current;
  };

  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => () => void commitRef.current(), []);

  const setItems = (fn: (items: LiturgyItem[]) => LiturgyItem[]) =>
    updateDraft((d) => ({ ...d, items: renumber(fn(d.items)) }));

  const updateItem = (id: string, p: Partial<LiturgyItem>) =>
    setItems((items) => items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const moveItem = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= draftRef.current.items.length) return;
    setItems((items) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    void commit();
  };

  const toggleItem = (id: string) => {
    const wasOpen = expandedId;
    setExpandedId((cur) => (cur === id ? null : id));
    if (wasOpen) void commit();
  };

  const addItem = () => {
    const id = newItemId();
    setItems((items) => [...items, { id, order: 0, type: 'custom', title: '' }]);
    setExpandedId(id);
  };

  const removeItem = async (item: LiturgyItem) => {
    const ok = await confirm({
      title: 'Remover momento',
      message: `"${item.title.trim() || typeInfo(item.type).label}" será removido da liturgia.`,
      confirmLabel: 'Remover',
    });
    if (!ok) return;
    setItems((all) => all.filter((i) => i.id !== item.id));
    setExpandedId((cur) => (cur === item.id ? null : cur));
    void commit();
  };

  const useTemplate = () => {
    setItems(() => DEFAULT_ITEMS.map((i) => ({ ...i, id: newItemId(), order: 0 })));
    void commit();
  };

  const applyImport = () => {
    const parsed = parseLiturgyMarkdown(importText, songs);
    if (!parsed.length) {
      setImportError('Nenhum momento reconhecido. Confira o formato na ajuda.');
      return;
    }
    setItems(() => parsed);
    setExpandedId(null);
    setImportOpen(false);
    setImportError('');
    void commit();
  };

  const current: Liturgy = { ...liturgy, ...draft };
  const service = serviceInfo ?? {};

  const deleteLiturgy = async () => {
    const ok = await confirm({
      title: 'Excluir liturgia',
      message: 'A liturgia e todos os momentos serão removidos.',
      confirmLabel: 'Excluir liturgia',
    });
    if (ok) await onDelete(liturgy.id);
  };

  const sectionClass = 'bg-surface border border-line rounded-2xl shadow-card';
  const items = draft.items;

  return (
    <div className="space-y-4">
      <section className={cn(sectionClass, 'p-4 flex flex-wrap items-center gap-2')}>
        <p className="text-sm font-bold text-fg flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-brand-text" />
          Liturgia
          <span className="text-fg-subtle font-semibold">
            {items.length} momento{items.length === 1 ? '' : 's'}
          </span>
          {saving ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-subtle">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Salvando…
            </span>
          ) : saveFailed ? (
            <button
              type="button"
              onClick={() => void commit()}
              className="text-xs font-semibold text-danger-text hover:underline"
            >
              Não salvo · tentar de novo
            </button>
          ) : null}
        </p>
        <ActionButton
          variant="primary"
          icon={Tv}
          collapseLabel
          disabled={!items.length}
          onClick={() => {
            setSlide(0);
            setPresenting(true);
          }}
          title="Projetar liturgia no telão"
        >
          Projetar
        </ActionButton>
        <ActionButton variant="light" icon={Printer} collapseLabel onClick={() => setPrinting(true)} title="Ver boletim">
          Boletim
        </ActionButton>
        <ActionButton
          variant="danger"
          icon={Trash2}
          onClick={() => void deleteLiturgy()}
          aria-label="Excluir liturgia"
          title="Excluir liturgia"
        />
      </section>

      <section className={sectionClass}>
        <div className="px-4 pt-4 pb-3 flex flex-wrap items-center gap-2 border-b border-line">
          <h3 className="text-sm font-bold text-fg flex items-center gap-2 flex-1 min-w-0">
            <Layers className="w-4 h-4 text-brand-text" />
            Momentos
          </h3>
          <ActionButton
            variant={importOpen ? 'secondary' : 'light'}
            icon={FileDown}
            collapseLabel
            aria-pressed={importOpen}
            onClick={() => {
              setImportOpen((v) => !v);
              setImportError('');
            }}
          >
            Importar texto
          </ActionButton>
        </div>

        {importOpen && (
          <div className="px-4 py-3 border-b border-line bg-surface-2/60 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-fg-muted flex-1 min-w-[12rem]">
                Cole os momentos do culto. A importação substitui os momentos atuais.
              </p>
              <ActionButton
                variant={importHelp ? 'secondary' : 'light'}
                icon={HelpCircle}
                onClick={() => setImportHelp((v) => !v)}
                aria-label="Ajuda do formato"
                title="Ajuda do formato"
              />
              <ActionButton
                variant="light"
                icon={FileText}
                onClick={() => {
                  setImportText(LITURGY_MARKDOWN_EXAMPLE);
                  setImportError('');
                }}
              >
                Usar exemplo
              </ActionButton>
            </div>
            {importHelp && (
              <div className="text-xs text-fg-muted whitespace-pre-wrap leading-relaxed bg-surface border border-line rounded-lg p-3">
                {LITURGY_MARKDOWN_HELP}
              </div>
            )}
            <Textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError('');
              }}
              rows={8}
              spellCheck={false}
              className="font-mono text-xs"
            />
            {importError && <p className="text-xs text-danger-text">{importError}</p>}
            <div className="flex justify-end gap-2">
              <ActionButton variant="light" onClick={() => setImportOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton variant="primary" icon={Check} onClick={applyImport}>
                Aplicar
              </ActionButton>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-3">
            <p className="text-sm text-fg-muted">Nenhum momento ainda.</p>
            <ActionButton variant="secondary" icon={Layers} onClick={useTemplate} className="mx-auto">
              Usar modelo padrão
            </ActionButton>
          </div>
        ) : (
          <Reorder.Group
            as="ol"
            axis="y"
            values={items.map((i) => i.id)}
            onReorder={(ids: string[]) =>
              setItems((all) => ids.map((id) => all.find((i) => i.id === id)!).filter(Boolean))
            }
            className="divide-y divide-line"
          >
            {items.map((item, idx) => (
              <LiturgyItemRow
                key={item.id}
                item={item}
                index={idx}
                songs={songs}
                expanded={expandedId === item.id}
                onToggle={() => toggleItem(item.id)}
                onChange={(p) => updateItem(item.id, p)}
                onMove={(delta) => moveItem(idx, delta)}
                onDragEnd={() => void commit()}
                onRemove={() => void removeItem(item)}
                onSelectSong={onSelectSong}
              />
            ))}
          </Reorder.Group>
        )}

        <div className="px-4 py-3 border-t border-line bg-surface-2/60 rounded-b-2xl">
          <ActionButton variant="secondary" icon={Plus} onClick={addItem}>
            Adicionar momento
          </ActionButton>
        </div>
      </section>

      {presenting && current.items[slide] && (
        <div className="fixed inset-0 z-50 bg-stone-950 text-stone-100 flex flex-col justify-between p-6 sm:p-12">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-mono text-xs font-bold">
              PROJEÇÃO LITÚRGICA
            </span>
            <ActionButton variant="glass" icon={X} onClick={() => setPresenting(false)}>
              Sair
            </ActionButton>
          </div>

          <div className="max-w-4xl mx-auto text-center my-auto space-y-6">
            <span className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-800/60 inline-block">
              Momento {slide + 1} de {current.items.length}
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-bold text-stone-100 leading-tight">
              {current.items[slide].title}
            </h2>
            {current.items[slide].details && (
              <p className="text-lg sm:text-2xl text-emerald-200/90 font-serif italic max-w-2xl mx-auto">
                "{current.items[slide].details}"
              </p>
            )}
            {current.items[slide].responsible && (
              <p className="text-sm text-stone-400">
                Dirigido por: <strong className="text-stone-200">{current.items[slide].responsible}</strong>
              </p>
            )}
            {(() => {
              const song = songs.find((s) => s.id === current.items[slide].songId);
              if (!song || !onSelectSong) return null;
              return (
                <ActionButton
                  variant="primary"
                  icon={Music}
                  onClick={() => {
                    setPresenting(false);
                    onSelectSong(song);
                  }}
                  className="mx-auto"
                >
                  Abrir {song.number ? `hino ${song.number} - ` : ''}
                  {song.title}
                </ActionButton>
              );
            })()}
          </div>

          <div className="flex items-center justify-between border-t border-stone-800 pt-4 max-w-4xl mx-auto w-full">
            <ActionButton
              variant="glass"
              icon={ChevronLeft}
              onClick={() => setSlide((s) => Math.max(0, s - 1))}
              disabled={slide === 0}
            >
              Anterior
            </ActionButton>
            <span className="text-xs font-mono text-stone-400">
              {slide + 1} / {current.items.length}
            </span>
            <ActionButton
              variant="primary"
              icon={ChevronRight}
              onClick={() => setSlide((s) => Math.min(current.items.length - 1, s + 1))}
              disabled={slide === current.items.length - 1}
            >
              Próximo
            </ActionButton>
          </div>
        </div>
      )}

      {printing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold font-mono text-stone-700 uppercase">Boletim litúrgico</span>
              <div className="flex items-center gap-2">
                <ActionButton variant="primary" icon={Printer} onClick={() => window.print()}>
                  Imprimir
                </ActionButton>
                <ActionButton
                  variant="light"
                  icon={X}
                  onClick={() => setPrinting(false)}
                  aria-label="Fechar"
                  title="Fechar"
                />
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 font-serif">
              <div className="text-center border-b border-stone-300 pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-stone-900">{churchName || 'Igreja'}</h2>
                <h3 className="text-lg italic text-stone-700 mt-1">{current.serviceTitle}</h3>
                <p className="text-xs font-sans text-stone-500 mt-1">
                  Data: {new Date(`${current.date}T00:00:00`).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {(service.theme || service.bibleVerse) && (
                <div className="text-center text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-2">
                  {service.theme && (
                    <div>
                      <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5">Tema</p>
                      <p className="font-semibold text-stone-800">{service.theme}</p>
                    </div>
                  )}
                  {service.bibleVerse && (
                    <div>
                      <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5">Texto bíblico</p>
                      <p className="italic">"{service.bibleVerse}"</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-sans font-bold uppercase text-stone-500 tracking-wider border-b pb-1">
                  Ordem do culto
                </h4>
                <div className="space-y-2 text-sm">
                  {current.items.map((item, idx) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-stone-900">
                          {idx + 1}. {item.title}
                        </span>
                        {item.details && <span className="text-xs italic text-stone-600 block pl-4">({item.details})</span>}
                      </div>
                      {item.responsible && <span className="text-xs font-sans text-stone-500">{item.responsible}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {(service.preacher || service.leader) && (
                <div className="pt-4 border-t border-stone-300 text-xs font-sans flex justify-between text-stone-600">
                  {service.preacher && (
                    <span>
                      Pregador: <strong>{service.preacher}</strong>
                    </span>
                  )}
                  {service.leader && (
                    <span>
                      Dirigente: <strong>{service.leader}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
