import React, { useState } from 'react';
import { 
  Liturgy, 
  Church, 
  Song, 
  LiturgyItem, 
  LiturgyItemType 
} from '../types';
import { 
  FileText, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  MoveUp, 
  MoveDown, 
  Tv, 
  Printer, 
  Music, 
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle,
  FileDown,
  Loader2,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { SongSearchSelect } from './SongSearchSelect';
import { useConfirm } from '@/contexts/ConfirmProvider';
import {
  LITURGY_MARKDOWN_EXAMPLE,
  LITURGY_MARKDOWN_HELP,
  parseLiturgyMarkdown,
} from '@/utils/liturgyMarkdown';

interface LiturgyManagerProps {
  liturgies: Liturgy[];
  churches: Church[];
  songs: Song[];
  onSaveLiturgy: (liturgy: Liturgy) => void | Promise<void>;
  onDeleteLiturgy: (id: string) => void | Promise<void>;
  onSelectSong?: (song: Song) => void;
  /** null = todas (admin) */
  allowedChurchIds?: string[] | null;
  /** Igreja ativa do menu — lista e formulário ficam nesse escopo */
  activeChurchId?: string;
  /** Título do evento vinculado (substitui o título da liturgia) */
  linkedEventTitle?: string;
  /** Data do evento vinculado (substitui a data da liturgia) */
  linkedEventDate?: string;
  /** Dentro do detalhe do evento: sem cabeçalho de página */
  embedded?: boolean;
  canManageLiturgies?: (orgId?: string | null) => boolean;
}

export const LiturgyManager: React.FC<LiturgyManagerProps> = ({
  liturgies,
  churches: churchesProp,
  songs,
  onSaveLiturgy,
  onDeleteLiturgy,
  onSelectSong,
  allowedChurchIds = null,
  activeChurchId,
  linkedEventTitle,
  linkedEventDate,
  embedded = false,
  canManageLiturgies = (_orgId?: string | null) => true,
}) => {
  const confirm = useConfirm();
  const churches =
    allowedChurchIds === null
      ? churchesProp
      : churchesProp.filter((c) => allowedChurchIds.includes(c.id));
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiturgy, setEditingLiturgy] = useState<Liturgy | null>(null);

  // Presentation Projection Mode State
  const [presentingLiturgy, setPresentingLiturgy] = useState<Liturgy | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Printable Bulletin View Modal State
  const [printingLiturgy, setPrintingLiturgy] = useState<Liturgy | null>(null);

  // Form State
  const [formChurchId, setFormChurchId] = useState('');
  const [formTheme, setFormTheme] = useState('');
  const [formBibleVerse, setFormBibleVerse] = useState('');
  const [formPreacher, setFormPreacher] = useState('');
  const [formLeader, setFormLeader] = useState('');
  const [formItems, setFormItems] = useState<LiturgyItem[]>([]);
  const [mdImportOpen, setMdImportOpen] = useState(false);
  const [mdImportText, setMdImportText] = useState(LITURGY_MARKDOWN_EXAMPLE);
  const [mdHelpOpen, setMdHelpOpen] = useState(false);
  const [mdImportError, setMdImportError] = useState('');
  const [saving, setSaving] = useState(false);

  const resolvedServiceTitle = (fallback?: string) =>
    (linkedEventTitle || fallback || 'Culto').trim() || 'Culto';

  const resolvedServiceDate = (fallback?: string) =>
    linkedEventDate || fallback || new Date().toISOString().slice(0, 10);

  const filteredLiturgies = liturgies
    .filter((l) => {
      if (allowedChurchIds !== null && !allowedChurchIds.includes(l.churchId)) return false;
      if (activeChurchId && l.churchId !== activeChurchId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Modal handlers
  const handleOpenNewModal = () => {
    const defaultChurchId = activeChurchId || churches[0]?.id || '';
    if (!defaultChurchId || !canManageLiturgies(defaultChurchId)) return;
    setEditingLiturgy(null);
    setFormChurchId(defaultChurchId);
    setFormTheme('');
    setFormBibleVerse('Salmo 95:1-7');
    setFormPreacher('');
    setFormLeader('');
    setFormItems([
      { id: 'item-1', order: 1, type: 'reading', title: 'Prelúdio Instrumental & Oração Silenciosa', duration: '3 min' },
      { id: 'item-2', order: 2, type: 'prayer', title: 'Oração de Invocação & Leitura Bíblica', duration: '5 min' },
      { id: 'item-3', order: 3, type: 'hymn', title: 'Cântico Congregacional de Louvor', duration: '5 min' },
      { id: 'item-4', order: 4, type: 'sermon', title: 'Pregação da Palavra de Deus', duration: '35 min' },
      { id: 'item-5', order: 5, type: 'benediction', title: 'Bênção Apostólica & Tríplice Amém', duration: '3 min' },
    ]);
    setMdImportOpen(false);
    setMdHelpOpen(false);
    setMdImportError('');
    setMdImportText(LITURGY_MARKDOWN_EXAMPLE);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (liturgy: Liturgy) => {
    if (!canManageLiturgies(liturgy.churchId)) return;
    setEditingLiturgy(liturgy);
    setFormChurchId(liturgy.churchId);
    setFormTheme(liturgy.theme || '');
    setFormBibleVerse(liturgy.bibleVerse || '');
    setFormPreacher(liturgy.preacher || '');
    setFormLeader(liturgy.leader || '');
    setFormItems([...liturgy.items]);
    setMdImportOpen(false);
    setMdHelpOpen(false);
    setMdImportError('');
    setMdImportText(LITURGY_MARKDOWN_EXAMPLE);
    setIsModalOpen(true);
  };

  const handleImportMarkdown = () => {
    const parsed = parseLiturgyMarkdown(mdImportText, songs);
    if (parsed.length === 0) {
      setMdImportError('Nenhum momento reconhecido. Confira o formato no ajuda.');
      return;
    }
    setMdImportError('');
    setFormItems(parsed);
    setMdImportOpen(false);
  };

  // Form Items Reordering
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formItems.length - 1) return;

    const updated = [...formItems];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // reassign order numbers
    updated.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setFormItems(updated);
  };

  const handleAddItemToForm = () => {
    const newItem: LiturgyItem = {
      id: `li-${Date.now()}`,
      order: formItems.length + 1,
      type: 'custom',
      title: 'Novo Momento Litúrgico',
      duration: '5 min',
    };
    setFormItems(prev => [...prev, newItem]);
  };

  const handleRemoveItemFromForm = (id: string) => {
    const updated = formItems.filter(i => i.id !== id);
    updated.forEach((item, idx) => {
      item.order = idx + 1;
    });
    setFormItems(updated);
  };

  const handleUpdateItemField = (index: number, field: keyof LiturgyItem, val: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: val };
    setFormItems(updated);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChurchId || saving) return;

    const liturgyToSave: Liturgy = {
      id: editingLiturgy?.id || `temp-liturgy-${Date.now()}`,
      churchId: activeChurchId || formChurchId,
      eventId: editingLiturgy?.eventId,
      date: resolvedServiceDate(editingLiturgy?.date),
      serviceTitle: resolvedServiceTitle(editingLiturgy?.serviceTitle),
      theme: formTheme,
      bibleVerse: formBibleVerse,
      preacher: formPreacher,
      leader: formLeader,
      items: formItems,
      createdAt: editingLiturgy ? editingLiturgy.createdAt : new Date().toISOString(),
    };

    setSaving(true);
    try {
      await Promise.resolve(onSaveLiturgy(liturgyToSave));
      setIsModalOpen(false);
    } catch {
      // toast já exibido pelo caller
    } finally {
      setSaving(false);
    }
  };

  // Helpers for Liturgy item badge colors
  const getItemBadge = (type: LiturgyItemType) => {
    switch (type) {
      case 'hymn':
        return {
          label: 'Música',
          bg: 'bg-emerald-950/80 light:bg-emerald-50 text-emerald-300 light:text-emerald-800 border-emerald-800/60 light:border-emerald-200',
        };
      case 'prayer':
        return {
          label: 'Oração',
          bg: 'bg-purple-950/80 light:bg-purple-50 text-purple-300 light:text-purple-800 border-purple-800/60 light:border-purple-200',
        };
      case 'reading':
        return {
          label: 'Leitura Bíblica',
          bg: 'bg-blue-950/80 light:bg-blue-50 text-blue-300 light:text-blue-800 border-blue-800/60 light:border-blue-200',
        };
      case 'sermon':
        return {
          label: 'Pregação',
          bg: 'bg-emerald-950/80 light:bg-emerald-50 text-emerald-300 light:text-emerald-800 border-emerald-800/60 light:border-emerald-200',
        };
      case 'offertory':
        return {
          label: 'Dízimos & Ofertas',
          bg: 'bg-emerald-900/40 light:bg-emerald-50 text-emerald-200 light:text-emerald-800 border-emerald-700/60 light:border-emerald-200',
        };
      case 'supper':
        return {
          label: 'Ceia do Senhor',
          bg: 'bg-rose-950/80 light:bg-rose-50 text-rose-300 light:text-rose-800 border-rose-800/60 light:border-rose-200',
        };
      case 'benediction':
        return {
          label: 'Bênção Final',
          bg: 'bg-indigo-950/80 light:bg-indigo-50 text-indigo-300 light:text-indigo-800 border-indigo-800/60 light:border-indigo-200',
        };
      default:
        return {
          label: 'Liturgia',
          bg: 'bg-stone-800 light:bg-stone-100 text-stone-300 light:text-stone-700 border-stone-700 light:border-stone-200',
        };
    }
  };

  return (
    <div className="w-full">
      {!embedded && (
      <div className="mb-6">
        <PageHeader
          icon={FileText}
          title="Liturgias"
          description="Monte a ordem do culto, leituras, orações e hinos com projeção e boletim impresso."
          actions={
            <PageHeaderButton icon={Plus} onClick={handleOpenNewModal}>
              Adicionar
            </PageHeaderButton>
          }
        />
      </div>
      )}

      {!embedded && (
      <p className="text-xs text-stone-500 font-mono mb-4">
        {filteredLiturgies.length} liturgias cadastradas
      </p>
      )}

      {/* Liturgy Cards Grid */}
      {filteredLiturgies.length === 0 ? (
        <div className="text-center py-12 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
          <FileText className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-300">Nenhuma liturgia cadastrada</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Crie o roteiro do próximo culto com a ordem das leituras, orações, hinos e bênção.
          </p>
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 bg-emerald-500 text-stone-950 font-bold rounded-button text-xs"
          >
            + Cadastrar Liturgia
          </button>
        </div>
      ) : (
        <div className={`grid gap-6 ${embedded ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {filteredLiturgies.map((liturgy) => {
            const church = churches.find(c => c.id === liturgy.churchId);

            return (
              <div
                key={liturgy.id}
                className={`bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl shadow-md flex flex-col justify-between transition-all ${
                  embedded ? 'p-3 sm:p-4' : 'p-6'
                }`}
              >
                <div>
                  {/* Top Info */}
                  <div className={`flex items-start gap-2 border-b border-stone-800 pb-3 ${embedded ? 'justify-end' : 'justify-between'}`}>
                    {!embedded && (
                      <div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          {church ? church.name : 'Congregação'}
                        </span>
                        <h3 className="text-xl font-display font-bold text-stone-100 mt-0.5">
                          {linkedEventTitle || liturgy.serviceTitle}
                        </h3>
                        <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-500" />
                          {new Date((linkedEventDate || liturgy.date) + 'T00:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setPresentingLiturgy(liturgy);
                          setCurrentSlideIndex(0);
                        }}
                        className="p-1.5 bg-stone-800 light:bg-emerald-50 hover:bg-emerald-500/20 light:hover:bg-emerald-100 text-emerald-300 light:text-emerald-800 rounded-button border border-stone-700 light:border-emerald-200 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Projetar Liturgia no Telão"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Projetar</span>
                      </button>

                      <button
                        onClick={() => setPrintingLiturgy(liturgy)}
                        className="p-1.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-stone-300 light:text-stone-700 rounded-button border border-stone-700 light:border-stone-300"
                        title="Ver Boletim Impresso"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(liturgy)}
                        className="p-1.5 text-stone-400 light:text-stone-600 hover:text-emerald-300 light:hover:text-emerald-700 hover:bg-stone-800 light:hover:bg-stone-100 rounded-button"
                        title="Editar Liturgia"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          void confirm({
                            title: 'Excluir liturgia',
                            message: `A ordem do culto "${liturgy.serviceTitle}" e seus itens serão removidos.`,
                            confirmLabel: 'Excluir liturgia',
                          }).then((ok) => {
                            if (ok) onDeleteLiturgy(liturgy.id);
                          });
                        }}
                        className="p-1.5 text-stone-400 light:text-stone-600 hover:text-rose-400 light:hover:text-rose-700 hover:bg-stone-800 light:hover:bg-rose-50 rounded-button"
                        title="Excluir Liturgia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preacher & Leader Info */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-stone-800/40 light:bg-stone-100 p-2.5 rounded-xl border border-stone-800 light:border-stone-200">
                    {liturgy.preacher && (
                      <span className="text-stone-300 light:text-stone-700 truncate">
                        <strong>Pregador:</strong> {liturgy.preacher}
                      </span>
                    )}
                    {liturgy.leader && (
                      <span className="text-stone-300 light:text-stone-700 truncate">
                        <strong>Dirigente:</strong> {liturgy.leader}
                      </span>
                    )}
                    {liturgy.theme && (
                      <span className="col-span-2 text-stone-200 light:text-stone-800 truncate">
                        <strong>Tema:</strong> {liturgy.theme}
                      </span>
                    )}
                    {liturgy.bibleVerse && (
                      <span className="col-span-2 text-emerald-300 light:text-emerald-800 truncate font-serif">
                        📖 {liturgy.bibleVerse}
                      </span>
                    )}
                  </div>

                  {/* Order Items Preview List */}
                  <div className="space-y-2 mt-4">
                    <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Ordem do Culto ({liturgy.items.length} momentos)
                    </h4>

                    <div className="space-y-1.5 pr-1">
                      {liturgy.items.map((item) => {
                        const badge = getItemBadge(item.type);
                        const linkedSong = item.songId ? songs.find(s => s.id === item.songId) : null;

                        return (
                          <div 
                            key={item.id} 
                            className="p-2 bg-stone-800/60 rounded-xl border border-stone-800 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-[10px] text-stone-500 w-4 font-bold shrink-0">
                                {item.order}.
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="font-semibold text-stone-200 truncate">
                                {item.title}
                              </span>
                            </div>

                            {linkedSong ? (
                              <button
                                onClick={() => onSelectSong && onSelectSong(linkedSong)}
                                className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0 hover:bg-emerald-500/30 rounded-button"
                              >
                                Hino #{linkedSong.number}
                              </button>
                            ) : item.responsible ? (
                              <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                                {item.responsible}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= EDIT / CREATE LITURGY MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-6xl xl:max-w-7xl overflow-hidden shadow-2xl max-h-[96vh] h-[96vh] sm:h-auto sm:max-h-[94vh] flex flex-col">
            
            <div className="p-3 sm:p-5 border-b border-stone-800 flex items-center justify-between shrink-0 gap-2">
              <h3 className="text-base sm:text-lg font-display font-bold text-stone-100 flex items-center gap-2 min-w-0 truncate">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {editingLiturgy ? 'Editar Liturgia' : 'Cadastrar Liturgia do Culto'}
                </span>
              </h3>
              <button 
                onClick={() => !saving && setIsModalOpen(false)}
                disabled={saving}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono p-1 rounded-button disabled:opacity-40 shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-3 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
              
              {/* Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Pregador
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rev. Marcos Silva"
                    value={formPreacher}
                    onChange={e => setFormPreacher(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tema principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: A soberania e a graça de Deus"
                    value={formTheme}
                    onChange={e => setFormTheme(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Texto Bíblico Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Salmo 95:1-7"
                    value={formBibleVerse}
                    onChange={e => setFormBibleVerse(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Reorder Manager */}
              <div className="pt-2 border-t border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <label className="text-sm font-bold text-stone-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Ordem dos Momentos da Liturgia
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMdHelpOpen((v) => !v);
                        if (!mdImportOpen) setMdImportOpen(true);
                      }}
                      className="p-1.5 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button border border-transparent hover:border-stone-700"
                      title="Ajuda do formato Markdown"
                      aria-label="Ajuda do formato Markdown"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMdImportOpen((v) => !v);
                        setMdImportError('');
                      }}
                      className={`px-3 py-1 border rounded-button text-xs font-bold inline-flex items-center gap-1.5 ${
                        mdImportOpen
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border-stone-700'
                      }`}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Importar Markdown
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItemToForm}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-button text-xs font-bold"
                    >
                      + Adicionar Momento
                    </button>
                  </div>
                </div>

                {mdImportOpen && (
                  <div className="mb-4 p-3 sm:p-4 bg-stone-950/80 border border-stone-800 rounded-xl space-y-3">
                    {mdHelpOpen && (
                      <div className="text-[11px] sm:text-xs text-stone-400 whitespace-pre-wrap leading-relaxed bg-stone-900/80 border border-stone-800 rounded-lg p-3">
                        {LITURGY_MARKDOWN_HELP}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-stone-500">
                        Cole a ordem do culto abaixo. A importação substitui os momentos atuais.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMdImportText(LITURGY_MARKDOWN_EXAMPLE);
                          setMdImportError('');
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold shrink-0"
                      >
                        Usar modelo
                      </button>
                    </div>
                    <textarea
                      value={mdImportText}
                      onChange={(e) => {
                        setMdImportText(e.target.value);
                        setMdImportError('');
                      }}
                      rows={9}
                      spellCheck={false}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-600/50 resize-y min-h-[140px]"
                      placeholder={LITURGY_MARKDOWN_EXAMPLE}
                    />
                    {mdImportError && (
                      <p className="text-[11px] text-rose-400">{mdImportError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setMdImportOpen(false)}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
                      >
                        Fechar
                      </button>
                      <button
                        type="button"
                        onClick={handleImportMarkdown}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-button text-xs font-bold"
                      >
                        Aplicar importação
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pr-1">
                  {formItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      className="p-2.5 sm:p-3 bg-stone-800/80 rounded-xl border border-stone-700 space-y-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-emerald-400 w-5 shrink-0">
                          {idx + 1}.
                        </span>

                        <select
                          value={item.type}
                          onChange={e => handleUpdateItemField(idx, 'type', e.target.value)}
                          className="min-w-0 flex-1 sm:flex-none sm:w-auto max-w-[55%] sm:max-w-none bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100 focus:outline-none font-semibold"
                        >
                          <option value="hymn">🎵 Música</option>
                          <option value="prayer">🙏 Oração</option>
                          <option value="reading">📖 Leitura Bíblica</option>
                          <option value="sermon">✝️ Pregação</option>
                          <option value="offertory">💸 Dízimos/Ofertas</option>
                          <option value="supper">🍷 Ceia do Senhor</option>
                          <option value="benediction">🕊️ Bênção Final</option>
                          <option value="custom">📌 Outro Momento</option>
                        </select>

                        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleMoveItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 text-stone-400 hover:text-emerald-300 disabled:opacity-20 rounded-button"
                            title="Mover para cima"
                            aria-label="Mover para cima"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(idx, 'down')}
                            disabled={idx === formItems.length - 1}
                            className="p-1.5 text-stone-400 hover:text-emerald-300 disabled:opacity-20 rounded-button"
                            title="Mover para baixo"
                            aria-label="Mover para baixo"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromForm(item.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-400 rounded-button"
                            title="Remover momento"
                            aria-label="Remover momento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="Título do Momento..."
                        value={item.title}
                        onChange={e => handleUpdateItemField(idx, 'title', e.target.value)}
                        className="w-full min-w-0 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none"
                      />

                      <div className="grid grid-cols-1 gap-2 text-xs pt-1 border-t border-stone-700/50">
                        <input
                          type="text"
                          placeholder="Responsável (ex: Pr. Carlos / Presb. João)..."
                          value={item.responsible || ''}
                          onChange={e => handleUpdateItemField(idx, 'responsible', e.target.value)}
                          className="w-full min-w-0 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200"
                        />

                        {item.type === 'hymn' ? (
                          <SongSearchSelect
                            songs={songs}
                            value={item.songId || ''}
                            onChange={(songId) =>
                              handleUpdateItemField(
                                idx,
                                'songId',
                                songId.trim() ? songId : undefined,
                              )
                            }
                            placeholder="Buscar por título, número ou artista…"
                            className="w-full min-w-0"
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="Detalhes (ex: Texto do Salmo 23)..."
                            value={item.details || ''}
                            onChange={e => handleUpdateItemField(idx, 'details', e.target.value)}
                            className="w-full min-w-0 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs shadow-md shadow-emerald-500/20 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Salvando…' : 'Salvar Liturgia'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= LITURGY SLIDE PROJECTION MODAL ================= */}
      {presentingLiturgy && (
        <div className="fixed inset-0 z-50 bg-stone-950 text-stone-100 flex flex-col justify-between p-6 sm:p-12">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-mono text-xs font-bold">
                PROJEÇÃO LITÚRGICA
              </span>
              <h3 className="text-sm font-serif text-stone-400 hidden sm:inline">
                {linkedEventTitle || presentingLiturgy.serviceTitle} • {linkedEventDate || presentingLiturgy.date}
              </h3>
            </div>

            <button
              onClick={() => setPresentingLiturgy(null)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-bold flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Sair
            </button>
          </div>

          {/* Current Slide Display */}
          {presentingLiturgy.items[currentSlideIndex] && (
            <div className="max-w-4xl mx-auto text-center my-auto space-y-6">
              
              <span className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-800/60 inline-block">
                Momento {currentSlideIndex + 1} de {presentingLiturgy.items.length}
              </span>

              <h2 className="text-3xl sm:text-5xl font-display font-bold text-stone-100 leading-tight">
                {presentingLiturgy.items[currentSlideIndex].title}
              </h2>

              {presentingLiturgy.items[currentSlideIndex].details && (
                <p className="text-lg sm:text-2xl text-emerald-200/90 font-serif italic max-w-2xl mx-auto">
                  "{presentingLiturgy.items[currentSlideIndex].details}"
                </p>
              )}

              {presentingLiturgy.items[currentSlideIndex].responsible && (
                <p className="text-sm text-stone-400 font-sans tracking-wide">
                  Dirigido por: <strong className="text-stone-200">{presentingLiturgy.items[currentSlideIndex].responsible}</strong>
                </p>
              )}

              {presentingLiturgy.items[currentSlideIndex].songId && (
                <div className="pt-4">
                  {(() => {
                    const song = songs.find(s => s.id === presentingLiturgy.items[currentSlideIndex].songId);
                    if (!song) return null;
                    return (
                      <button
                        onClick={() => {
                          setPresentingLiturgy(null);
                          if (onSelectSong) onSelectSong(song);
                        }}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-sm shadow-xl transition-transform hover:scale-105 inline-flex items-center gap-2"
                      >
                        <Music className="w-5 h-5" />
                        Abrir Hino #{song.number} - {song.title}
                      </button>
                    );
                  })()}
                </div>
              )}

            </div>
          )}

          {/* Slide Navigation Controls */}
          <div className="flex items-center justify-between border-t border-stone-800 pt-4 max-w-4xl mx-auto w-full">
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 rounded-button text-xs font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className="text-xs font-mono text-stone-400">
              {currentSlideIndex + 1} / {presentingLiturgy.items.length}
            </span>

            <button
              onClick={() => setCurrentSlideIndex(prev => Math.min(presentingLiturgy.items.length - 1, prev + 1))}
              disabled={currentSlideIndex === presentingLiturgy.items.length - 1}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-stone-950 font-bold rounded-button text-xs flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ================= PRINTABLE BULLETIN MODAL ================= */}
      {printingLiturgy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            
            <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold font-mono text-stone-700 uppercase">
                Boletim Litúrgico Impresso
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-button text-xs flex items-center gap-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={() => setPrintingLiturgy(null)}
                  className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-button"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 font-serif">
              
              <div className="text-center border-b border-stone-300 pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-stone-900">
                  {churches.find(c => c.id === printingLiturgy.churchId)?.name || 'Igreja'}
                </h2>
                <h3 className="text-lg font-serif italic text-stone-700 mt-1">
                  {linkedEventTitle || printingLiturgy.serviceTitle}
                </h3>
                <p className="text-xs font-sans text-stone-500 mt-1">
                  Data: {new Date((linkedEventDate || printingLiturgy.date) + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>

              {(printingLiturgy.theme || printingLiturgy.bibleVerse) && (
                <div className="text-center italic text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-1">
                  {printingLiturgy.theme && (
                    <div>
                      <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5 not-italic">
                        Tema principal
                      </p>
                      <p className="not-italic font-semibold text-stone-800">{printingLiturgy.theme}</p>
                    </div>
                  )}
                  {printingLiturgy.bibleVerse && (
                    <div>
                      <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5 not-italic">
                        Texto bíblico
                      </p>
                      "{printingLiturgy.bibleVerse}"
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-sans font-bold uppercase text-stone-500 tracking-wider border-b pb-1">
                  Ordem do Culto
                </h4>

                <div className="space-y-2 text-sm">
                  {printingLiturgy.items.map((item, idx) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div>
                        <span className="font-bold mr-2 text-stone-900">{idx + 1}. {item.title}</span>
                        {item.details && <span className="text-xs italic text-stone-600 block pl-4">({item.details})</span>}
                      </div>
                      {item.responsible && (
                        <span className="text-xs font-sans text-stone-500">{item.responsible}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {printingLiturgy.preacher && (
                <div className="pt-4 border-t border-stone-300 text-xs font-sans flex justify-between text-stone-600">
                  <span>Pregador: <strong>{printingLiturgy.preacher}</strong></span>
                  {printingLiturgy.leader && <span>Dirigente: <strong>{printingLiturgy.leader}</strong></span>}
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
