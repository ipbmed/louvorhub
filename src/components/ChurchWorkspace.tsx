import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Church,
  ChevronRight,
  Edit3,
  LayoutGrid,
  Loader2,
  MapPin,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Church as ChurchType, ChurchEvent, ViewMode } from '@/types';
import { PageHeader } from './PageHeader';

export const WORKSPACE_VIEWS: ViewMode[] = ['workspace', 'events', 'churches', 'users'];

interface ChurchWorkspaceProps {
  church: ChurchType;
  currentView: ViewMode;
  canAccessEvents: boolean;
  canManageGroups: boolean;
  canManageMembers: boolean;
  canEditChurch?: boolean;
  onSaveChurch?: (church: ChurchType) => void | Promise<void>;
  onNavigate: (view: ViewMode) => void;
  /** Voltar contextual (ex.: do detalhe do evento para o calendário). */
  onBack?: () => void;
  backLabel?: string;
  /** Incrementa para abrir o modal de edição (ex.: lápis no header mobile). */
  editRequestKey?: number;
  /** Próximos eventos na aba Início. */
  events?: ChurchEvent[];
  onOpenEvent?: (eventId: string) => void;
  children?: React.ReactNode;
}

type WorkspaceTab = {
  view: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ChurchForm = {
  name: string;
  city: string;
  address: string;
  leader: string;
  phone: string;
  sigla: string;
  color: string;
};

export const ChurchWorkspace: React.FC<ChurchWorkspaceProps> = ({
  church,
  currentView,
  canAccessEvents,
  canManageGroups,
  canManageMembers,
  canEditChurch = false,
  onSaveChurch,
  onNavigate,
  onBack,
  backLabel,
  editRequestKey = 0,
  events = [],
  onOpenEvent,
  children,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState<ChurchForm>({
    name: '',
    city: '',
    address: '',
    leader: '',
    phone: '',
    sigla: '',
    color: '#10b981',
  });

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const tabs: WorkspaceTab[] = [
    { view: 'workspace', label: 'Início', icon: LayoutGrid },
    ...(canAccessEvents
      ? [{ view: 'events' as ViewMode, label: 'Eventos', icon: Calendar }]
      : []),
    ...(canManageGroups
      ? [{ view: 'churches' as ViewMode, label: 'Bandas', icon: Building2 }]
      : []),
    ...(canManageMembers
      ? [{ view: 'users' as ViewMode, label: 'Membros', icon: Users }]
      : []),
  ];

  const moduleTabs = tabs.filter((t) => t.view !== 'workspace');
  const address = church.address?.trim() || '';
  const leader = church.leader?.trim() || '';

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((ev) => {
        const d = new Date(`${ev.date}T00:00:00`);
        return !Number.isNaN(d.getTime()) && d >= today;
      })
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return (a.time || '').localeCompare(b.time || '');
      })
      .slice(0, 6);
  }, [events]);

  const headerMeta =
    address || leader ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {address && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-500 light:text-stone-400" />
            <span className="truncate">{address}</span>
          </span>
        )}
        {leader && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 shrink-0 text-stone-500 light:text-stone-400" />
            <span>
              Líder:{' '}
              <span className="font-semibold text-stone-300 light:text-stone-700">{leader}</span>
            </span>
          </span>
        )}
      </div>
    ) : undefined;

  const openEdit = () => {
    setForm({
      name: church.name || '',
      city: church.city || '',
      address: church.address || '',
      leader: church.leader || '',
      phone: church.phone || '',
      sigla: church.sigla || '',
      color: church.color || '#10b981',
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (!editRequestKey) return;
    if (!canEditChurch || !onSaveChurch) return;
    openEdit();
    // Trigger externo (header): reabre o modal a cada incremento da chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequestKey]);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveChurch) return;
    if (!form.name.trim() || !form.city.trim()) {
      setErrorMsg('Nome e cidade são obrigatórios.');
      return;
    }
    if (!form.sigla.trim()) {
      setErrorMsg('A sigla da igreja é obrigatória.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await onSaveChurch({
        ...church,
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        leader: form.leader.trim() || undefined,
        phone: form.phone.trim() || undefined,
        sigla: form.sigla.trim(),
        color: form.color,
      });
      setModalOpen(false);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível salvar a igreja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-300">
      {/* Desktop / tablet: cabeçalho completo (rola junto com a página) */}
      <div className="hidden sm:block">
        <PageHeader
          icon={Church}
          title={church.name}
          description={headerMeta}
          onIconClick={canEditChurch && onSaveChurch ? openEdit : undefined}
          iconTitle={canEditChurch && onSaveChurch ? 'Editar igreja' : undefined}
          iconBadge={canEditChurch && onSaveChurch ? Edit3 : undefined}
          onTitleClick={() => onNavigate('workspace')}
          titleTitle="Ir para Início"
          actions={
            <button
              type="button"
              onClick={() => (onBack ? onBack() : onNavigate('public'))}
              title={onBack ? backLabel || 'Voltar' : 'Voltar ao catálogo'}
              aria-label={onBack ? backLabel || 'Voltar' : 'Voltar ao catálogo'}
              className="p-2.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-emerald-300 light:text-emerald-800 rounded-button border border-stone-700 light:border-stone-300 transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          }
        />
      </div>

      {tabs.length > 0 && (
        <div
          className="sticky top-16 sm:top-20 z-20 flex w-full border-b border-stone-800 light:border-stone-200 bg-stone-950/95 light:bg-white/95 backdrop-blur-md"
          role="tablist"
          aria-label="Navegação do workspace"
        >
          {tabs.map(({ view, label, icon: Icon }) => {
            const selected = currentView === view;
            return (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={selected}
                title={label}
                onClick={() => onNavigate(view)}
                className={`relative flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2.5 sm:py-3 text-[11px] sm:text-sm transition-colors border-b-[3px] rounded-none ${
                  selected
                    ? 'border-emerald-500 bg-emerald-500/25 light:bg-emerald-100 text-emerald-100 light:text-emerald-900 font-bold shadow-[inset_0_1px_0_0_rgba(16,185,129,0.35)]'
                    : 'border-transparent text-stone-500 light:text-stone-500 font-semibold hover:text-stone-200 light:hover:text-stone-800 hover:border-stone-600 light:hover:border-stone-300 hover:bg-stone-800/40 light:hover:bg-stone-100'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                    selected
                      ? 'text-emerald-300 light:text-emerald-700'
                      : 'text-stone-600 light:text-stone-400'
                  }`}
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
      {currentView === 'workspace' ? (
        moduleTabs.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 text-center text-stone-400 space-y-2">
            <Church className="w-10 h-10 text-stone-600 mx-auto" />
            <p className="font-display text-lg text-stone-200">{church.name}</p>
            <p className="text-xs max-w-md mx-auto">
              Você está associado a esta igreja, mas ainda não possui permissão de eventos, grupos ou
              membros. Peça ao administrador para liberar o acesso.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="sm:hidden">
              <h2 className="font-display text-xl font-bold text-stone-100 light:text-stone-900 tracking-tight">
                {church.name}
              </h2>
            </div>

            {canAccessEvents && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-md">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Próximos eventos
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('events')}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5"
                  >
                    Ver todos
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">
                    Nenhum evento próximo agendado.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {upcomingEvents.map((ev) => (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('events');
                            onOpenEvent?.(ev.id);
                          }}
                          className="w-full text-left flex items-center gap-3 rounded-xl border border-stone-800 light:border-stone-200 hover:border-emerald-700/50 light:hover:border-emerald-300 bg-stone-950/50 light:bg-slate-50 hover:bg-stone-950 light:hover:bg-white px-3 py-2.5 transition-colors"
                        >
                          <div className="shrink-0 w-12 text-center">
                            <p className="text-[10px] font-bold uppercase text-emerald-400 light:text-emerald-700 leading-none">
                              {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                weekday: 'short',
                              })}
                            </p>
                            <p className="text-sm font-display font-bold text-stone-100 light:text-stone-900 leading-tight mt-0.5">
                              {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-stone-100 light:text-stone-900 truncate">
                              {ev.title}
                            </p>
                            <p className="text-[11px] text-stone-500 light:text-stone-600 truncate">
                              {ev.time ? `${ev.time}` : 'Horário a definir'}
                              {ev.theme ? ` · ${ev.theme}` : ''}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-600 light:text-stone-400 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        children
      )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-stone-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-display font-bold text-emerald-100">Editar igreja</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-stone-400 hover:text-stone-100"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/60 border border-rose-800/60 rounded-2xl p-3 mb-4 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-sm">
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Nome</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Cidade</label>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">
                    Sigla <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    required
                    value={form.sigla}
                    onChange={(e) => setForm((p) => ({ ...p, sigla: e.target.value }))}
                    placeholder="Ex: IPM"
                    maxLength={20}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Endereço</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Líder</label>
                  <input
                    value={form.leader}
                    onChange={(e) => setForm((p) => ({ ...p, leader: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Telefone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
