import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  GripVertical,
  HelpCircle,
  Layers,
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
import { SongSearchSelect } from './SongSearchSelect';
import { ActionButton, Field, Input, Select, Textarea, cn } from './ui';

const ITEM_TYPES: { value: LiturgyItemType; label: string }[] = [
  { value: 'hymn', label: '🎵 Música' },
  { value: 'prayer', label: '🙏 Oração' },
  { value: 'reading', label: '📖 Leitura bíblica' },
  { value: 'sermon', label: '✝️ Pregação' },
  { value: 'offertory', label: '💸 Dízimos e ofertas' },
  { value: 'supper', label: '🍷 Ceia do Senhor' },
  { value: 'benediction', label: '🕊️ Bênção final' },
  { value: 'custom', label: '📌 Outro momento' },
];

const DEFAULT_ITEMS: Omit<LiturgyItem, 'id' | 'order'>[] = [
  { type: 'reading', title: 'Prelúdio e oração silenciosa', duration: '3 min' },
  { type: 'prayer', title: 'Oração de invocação e leitura bíblica', duration: '5 min' },
  { type: 'hymn', title: 'Cântico congregacional', duration: '5 min' },
  { type: 'sermon', title: 'Pregação da Palavra', duration: '35 min' },
  { type: 'benediction', title: 'Bênção apostólica e tríplice amém', duration: '3 min' },
];

type Draft = Pick<Liturgy, 'preacher' | 'leader' | 'theme' | 'bibleVerse' | 'items'>;

const toDraft = (l: Liturgy): Draft => ({
  preacher: l.preacher || '',
  leader: l.leader || '',
  theme: l.theme || '',
  bibleVerse: l.bibleVerse || '',
  items: l.items.map((i) => ({ ...i })),
});

const renumber = (items: LiturgyItem[]) => items.map((item, i) => ({ ...item, order: i + 1 }));

const newItemId = () => `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface LiturgyItemRowProps {
  item: LiturgyItem;
  index: number;
  songs: Song[];
  onChange: (patch: Partial<LiturgyItem>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onSelectSong?: (song: Song) => void;
}

const LiturgyItemRow: React.FC<LiturgyItemRowProps> = ({
  item,
  index,
  songs,
  onChange,
  onMove,
  onRemove,
  onSelectSong,
}) => {
  const dragControls = useDragControls();
  const linkedSong = item.songId ? songs.find((s) => s.id === item.songId) : undefined;

  return (
    <Reorder.Item
      as="li"
      value={item.id}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.01, boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)', zIndex: 10 }}
      className="relative bg-surface px-4 py-3 flex gap-2 sm:gap-3"
    >
      <div className="flex flex-col items-center gap-1 shrink-0">
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
          className="w-7 h-9 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2 cursor-grab active:cursor-grabbing"
          aria-label={`Arrastar momento ${index + 1} (setas para mover)`}
          title="Arraste para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-text text-[11px] font-bold flex items-center justify-center">
          {index + 1}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Select
            value={item.type}
            onChange={(e) => onChange({ type: e.target.value as LiturgyItemType })}
            aria-label="Tipo do momento"
            className="w-auto h-9 py-0 text-sm"
          >
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Título do momento"
            aria-label="Título do momento"
            className="w-auto flex-1 min-w-[12rem] h-9 py-0 text-sm font-semibold"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={item.responsible || ''}
            onChange={(e) => onChange({ responsible: e.target.value || undefined })}
            placeholder="Responsável"
            aria-label="Responsável"
            className="h-9 py-0 text-sm"
          />
          {item.type === 'hymn' ? (
            <div className="flex gap-2 min-w-0">
              <SongSearchSelect
                songs={songs}
                value={item.songId || ''}
                onChange={(songId) => onChange({ songId: songId.trim() || undefined })}
                placeholder="Buscar música…"
                className="flex-1 min-w-0"
              />
              {linkedSong && onSelectSong && (
                <ActionButton
                  variant="light"
                  icon={Music}
                  onClick={() => onSelectSong(linkedSong)}
                  aria-label="Abrir música"
                  title="Abrir música"
                />
              )}
            </div>
          ) : (
            <Input
              value={item.details || ''}
              onChange={(e) => onChange({ details: e.target.value || undefined })}
              placeholder="Detalhes (ex.: Salmo 23)"
              aria-label="Detalhes"
              className="h-9 py-0 text-sm"
            />
          )}
        </div>
      </div>
      <ActionButton
        variant="light"
        icon={X}
        onClick={onRemove}
        aria-label="Remover momento"
        title="Remover momento"
        className="shrink-0"
      />
    </Reorder.Item>
  );
};

interface EventLiturgyPanelProps {
  liturgy: Liturgy;
  songs: Song[];
  churchName?: string;
  onSave: (liturgy: Liturgy) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onSelectSong?: (song: Song) => void;
}

/** Liturgia do evento editada no lugar: dados do culto e ordem dos momentos, com salvar/descartar. */
export const EventLiturgyPanel: React.FC<EventLiturgyPanelProps> = ({
  liturgy,
  songs,
  churchName,
  onSave,
  onDelete,
  onSelectSong,
}) => {
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft>(() => toDraft(liturgy));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importHelp, setImportHelp] = useState(false);
  const [importText, setImportText] = useState(LITURGY_MARKDOWN_EXAMPLE);
  const [importError, setImportError] = useState('');

  const [presenting, setPresenting] = useState(false);
  const [slide, setSlide] = useState(0);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(toDraft(liturgy));
  }, [liturgy, dirty]);

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const setItems = (fn: (items: LiturgyItem[]) => LiturgyItem[]) => {
    setDraft((d) => ({ ...d, items: renumber(fn(d.items)) }));
    setDirty(true);
  };

  const updateItem = (id: string, p: Partial<LiturgyItem>) =>
    setItems((items) => items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const moveItem = (index: number, delta: -1 | 1) =>
    setItems((items) => {
      const target = index + delta;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addItem = () =>
    setItems((items) => [...items, { id: newItemId(), order: 0, type: 'custom', title: '' }]);

  const useTemplate = () =>
    setItems(() => DEFAULT_ITEMS.map((i) => ({ ...i, id: newItemId(), order: 0 })));

  const applyImport = () => {
    const parsed = parseLiturgyMarkdown(importText, songs);
    if (!parsed.length) {
      setImportError('Nenhum momento reconhecido. Confira o formato na ajuda.');
      return;
    }
    setItems(() => parsed);
    setImportOpen(false);
    setImportError('');
  };

  const current: Liturgy = { ...liturgy, ...draft };

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        ...current,
        items: draft.items.map((i) => ({ ...i, title: i.title.trim() || 'Momento' })),
      });
      setDirty(false);
    } catch {
      // erro já exibido pelo caller
    } finally {
      setSaving(false);
    }
  };

  const discard = () => setDirty(false);

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

      <section className={cn(sectionClass, 'p-4 grid gap-3 sm:grid-cols-2')}>
        <Field label="Pregador">
          {(id) => (
            <Input
              id={id}
              value={draft.preacher}
              onChange={(e) => patch({ preacher: e.target.value })}
              placeholder="Ex.: Rev. Marcos Silva"
            />
          )}
        </Field>
        <Field label="Dirigente">
          {(id) => (
            <Input
              id={id}
              value={draft.leader}
              onChange={(e) => patch({ leader: e.target.value })}
              placeholder="Ex.: Presb. João"
            />
          )}
        </Field>
        <Field label="Tema">
          {(id) => (
            <Input
              id={id}
              value={draft.theme}
              onChange={(e) => patch({ theme: e.target.value })}
              placeholder="Ex.: A soberania de Deus"
            />
          )}
        </Field>
        <Field label="Texto bíblico">
          {(id) => (
            <Input
              id={id}
              value={draft.bibleVerse}
              onChange={(e) => patch({ bibleVerse: e.target.value })}
              placeholder="Ex.: Salmo 95:1-7"
            />
          )}
        </Field>
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
                onChange={(p) => updateItem(item.id, p)}
                onMove={(delta) => moveItem(idx, delta)}
                onRemove={() => setItems((all) => all.filter((i) => i.id !== item.id))}
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

      {dirty && (
        <div className="sticky z-20 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 flex items-center gap-2 rounded-2xl border border-line bg-surface/95 backdrop-blur-md shadow-card-lg px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-sm font-semibold text-fg flex-1 min-w-0">Alterações não salvas</p>
          <ActionButton variant="light" onClick={discard} disabled={saving}>
            Descartar
          </ActionButton>
          <ActionButton variant="primary" icon={Check} onClick={() => void save()} loading={saving}>
            Salvar
          </ActionButton>
        </div>
      )}

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

              {(current.theme || current.bibleVerse) && (
                <div className="text-center text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-2">
                  {current.theme && (
                    <div>
                      <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5">Tema</p>
                      <p className="font-semibold text-stone-800">{current.theme}</p>
                    </div>
                  )}
                  {current.bibleVerse && (
                    <div>
                      <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5">Texto bíblico</p>
                      <p className="italic">"{current.bibleVerse}"</p>
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

              {(current.preacher || current.leader) && (
                <div className="pt-4 border-t border-stone-300 text-xs font-sans flex justify-between text-stone-600">
                  {current.preacher && (
                    <span>
                      Pregador: <strong>{current.preacher}</strong>
                    </span>
                  )}
                  {current.leader && (
                    <span>
                      Dirigente: <strong>{current.leader}</strong>
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
