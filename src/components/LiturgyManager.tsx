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
  BookOpen, 
  Tv, 
  Printer, 
  CheckCircle2, 
  User, 
  Music, 
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';

interface LiturgyManagerProps {
  liturgies: Liturgy[];
  churches: Church[];
  songs: Song[];
  onSaveLiturgy: (liturgy: Liturgy) => void;
  onDeleteLiturgy: (id: string) => void;
  onSelectSong?: (song: Song) => void;
  /** null = todas (admin) */
  allowedChurchIds?: string[] | null;
  /** Igreja ativa do menu — lista e formulário ficam nesse escopo */
  activeChurchId?: string;
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
  embedded = false,
  canManageLiturgies = (_orgId?: string | null) => true,
}) => {
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
  const [formDate, setFormDate] = useState('');
  const [formServiceTitle, setFormServiceTitle] = useState('Culto Solene de Adoração');
  const [formTheme, setFormTheme] = useState('');
  const [formBibleVerse, setFormBibleVerse] = useState('');
  const [formPreacher, setFormPreacher] = useState('');
  const [formLeader, setFormLeader] = useState('');
  const [formItems, setFormItems] = useState<LiturgyItem[]>([]);

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
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormServiceTitle('Culto Solene de Adoração');
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
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (liturgy: Liturgy) => {
    if (!canManageLiturgies(liturgy.churchId)) return;
    setEditingLiturgy(liturgy);
    setFormChurchId(liturgy.churchId);
    setFormDate(liturgy.date);
    setFormServiceTitle(liturgy.serviceTitle);
    setFormTheme(liturgy.theme || '');
    setFormBibleVerse(liturgy.bibleVerse || '');
    setFormPreacher(liturgy.preacher || '');
    setFormLeader(liturgy.leader || '');
    setFormItems([...liturgy.items]);
    setIsModalOpen(true);
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

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChurchId || !formDate || !formServiceTitle) return;

    const liturgyToSave: Liturgy = {
      id: editingLiturgy?.id || `temp-liturgy-${Date.now()}`,
      churchId: activeChurchId || formChurchId,
      eventId: editingLiturgy?.eventId,
      date: formDate,
      serviceTitle: formServiceTitle,
      theme: formTheme,
      bibleVerse: formBibleVerse,
      preacher: formPreacher,
      leader: formLeader,
      items: formItems,
      createdAt: editingLiturgy ? editingLiturgy.createdAt : new Date().toISOString(),
    };

    onSaveLiturgy(liturgyToSave);
    setIsModalOpen(false);
  };

  // Helpers for Liturgy item badge colors
  const getItemBadge = (type: LiturgyItemType) => {
    switch (type) {
      case 'hymn':
        return { label: 'Hino / Louvor', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' };
      case 'prayer':
        return { label: 'Oração', bg: 'bg-purple-950/80 text-purple-300 border-purple-800/60' };
      case 'reading':
        return { label: 'Leitura Bíblica', bg: 'bg-blue-950/80 text-blue-300 border-blue-800/60' };
      case 'sermon':
        return { label: 'Pregação', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' };
      case 'offertory':
        return { label: 'Dízimos & Ofertas', bg: 'bg-emerald-900/40 text-emerald-200 border-emerald-700/60' };
      case 'supper':
        return { label: 'Ceia do Senhor', bg: 'bg-rose-950/80 text-rose-300 border-rose-800/60' };
      case 'benediction':
        return { label: 'Bênção Final', bg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60' };
      default:
        return { label: 'Liturgia', bg: 'bg-stone-800 text-stone-300 border-stone-700' };
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
                className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-6 shadow-md flex flex-col justify-between transition-all"
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
                          {liturgy.serviceTitle}
                        </h3>
                        <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-500" />
                          {new Date(liturgy.date + 'T00:00:00').toLocaleDateString('pt-BR', {
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
                        className="p-1.5 bg-stone-800 hover:bg-emerald-500/20 text-emerald-300 rounded-button border border-stone-700 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Projetar Liturgia no Telão"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Projetar</span>
                      </button>

                      <button
                        onClick={() => setPrintingLiturgy(liturgy)}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button border border-stone-700"
                        title="Ver Boletim Impresso"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(liturgy)}
                        className="p-1.5 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button"
                        title="Editar Liturgia"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Excluir esta liturgia?')) {
                            onDeleteLiturgy(liturgy.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-button"
                        title="Excluir Liturgia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preacher & Leader Info */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-stone-800/40 p-2.5 rounded-xl border border-stone-800">
                    {liturgy.preacher && (
                      <span className="text-stone-300 truncate">
                        <strong>Pregador:</strong> {liturgy.preacher}
                      </span>
                    )}
                    {liturgy.leader && (
                      <span className="text-stone-300 truncate">
                        <strong>Dirigente:</strong> {liturgy.leader}
                      </span>
                    )}
                    {liturgy.bibleVerse && (
                      <span className="col-span-2 text-emerald-300/90 truncate font-serif">
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

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            
            <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {editingLiturgy ? 'Editar Liturgia do Culto' : 'Cadastrar Liturgia do Culto'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono p-1 rounded-button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Church & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Igreja / Congregação <span className="text-emerald-400">*</span>
                  </label>
                  {activeChurchId ? (
                    <div className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200">
                      {churches.find((c) => c.id === formChurchId)?.name ||
                        churches[0]?.name ||
                        'Igreja ativa'}
                    </div>
                  ) : (
                    <select
                      required
                      value={formChurchId}
                      onChange={(e) => setFormChurchId(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none"
                    >
                      {churches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Título do Culto <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Culto Solene de Adoração"
                    value={formServiceTitle}
                    onChange={e => setFormServiceTitle(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date, Passage, Preacher */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Data do Culto <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Texto Bíblico Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Salmo 95:1-7"
                    value={formBibleVerse}
                    onChange={e => setFormBibleVerse(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Pregador
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rev. Marcos Silva"
                    value={formPreacher}
                    onChange={e => setFormPreacher(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Reorder Manager */}
              <div className="pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-stone-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Ordem dos Momentos da Liturgia
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemToForm}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-button text-xs font-bold"
                  >
                    + Adicionar Momento
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      className="p-3 bg-stone-800/80 rounded-xl border border-stone-700 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 w-5">
                          {idx + 1}.
                        </span>

                        {/* Item Type */}
                        <select
                          value={item.type}
                          onChange={e => handleUpdateItemField(idx, 'type', e.target.value)}
                          className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100 focus:outline-none font-semibold"
                        >
                          <option value="hymn">🎵 Hino / Louvor</option>
                          <option value="prayer">🙏 Oração</option>
                          <option value="reading">📖 Leitura Bíblica</option>
                          <option value="sermon">✝️ Pregação</option>
                          <option value="offertory">💸 Dízimos/Ofertas</option>
                          <option value="supper">🍷 Ceia do Senhor</option>
                          <option value="benediction">🕊️ Bênção Final</option>
                          <option value="custom">📌 Outro Momento</option>
                        </select>

                        {/* Title */}
                        <input
                          type="text"
                          required
                          placeholder="Título do Momento..."
                          value={item.title}
                          onChange={e => handleUpdateItemField(idx, 'title', e.target.value)}
                          className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-100 focus:outline-none"
                        />

                        {/* Reorder Buttons */}
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-stone-400 hover:text-emerald-300 disabled:opacity-20 rounded-button"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, 'down')}
                          disabled={idx === formItems.length - 1}
                          className="p-1 text-stone-400 hover:text-emerald-300 disabled:opacity-20 rounded-button"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromForm(item.id)}
                          className="p-1 text-stone-400 hover:text-rose-400 rounded-button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Details Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-700/50">
                        <input
                          type="text"
                          placeholder="Responsável (ex: Pr. Carlos / Presb. João)..."
                          value={item.responsible || ''}
                          onChange={e => handleUpdateItemField(idx, 'responsible', e.target.value)}
                          className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-200"
                        />

                        {/* Link Song Option if item type is 'hymn' */}
                        {item.type === 'hymn' ? (
                          <select
                            value={item.songId || ''}
                            onChange={e => handleUpdateItemField(idx, 'songId', e.target.value)}
                            className="bg-stone-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs text-emerald-300 focus:outline-none"
                          >
                            <option value="">Sem hino vinculado</option>
                            {songs.map(song => (
                              <option key={song.id} value={song.id}>Hino #{song.number} - {song.title}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Detalhes (ex: Texto do Salmo 23)..."
                            value={item.details || ''}
                            onChange={e => handleUpdateItemField(idx, 'details', e.target.value)}
                            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-200"
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
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs shadow-md shadow-emerald-500/20"
                >
                  Salvar Liturgia
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
                {presentingLiturgy.serviceTitle} • {presentingLiturgy.date}
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
            
            <div className="p-4 bg-stone-100 border-b flex items-center justify-between shrink-0">
              <span className="text-xs font-bold font-mono text-stone-600 uppercase">
                Boletim Litúrgico Impresso
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-stone-900 text-white font-bold rounded-button text-xs flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={() => setPrintingLiturgy(null)}
                  className="p-1 text-stone-500 hover:text-stone-900 rounded-button"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 font-serif">
              
              <div className="text-center border-b border-stone-300 pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-stone-900">
                  {churches.find(c => c.id === printingLiturgy.churchId)?.name || 'Igreja Presbiteriana'}
                </h2>
                <h3 className="text-lg font-serif italic text-stone-700 mt-1">
                  {printingLiturgy.serviceTitle}
                </h3>
                <p className="text-xs font-sans text-stone-500 mt-1">
                  Data: {new Date(printingLiturgy.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>

              {printingLiturgy.bibleVerse && (
                <div className="text-center italic text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                  <p className="text-xs font-sans font-bold uppercase text-stone-500 mb-0.5">Versículo do Culto</p>
                  "{printingLiturgy.bibleVerse}"
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
