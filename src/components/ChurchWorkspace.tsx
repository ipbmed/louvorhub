import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  Church,
  Edit3,
  LayoutGrid,
  Loader2,
  MapPin,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Church as ChurchType, ViewMode } from '@/types';
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
  /** Oculta as abas (ex.: detalhe de evento). */
  hideTabs?: boolean;
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
  hideTabs = false,
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
    { view: 'workspace', label: 'Visão geral', icon: LayoutGrid },
    ...(canAccessEvents
      ? [{ view: 'events' as ViewMode, label: 'Eventos', icon: Calendar }]
      : []),
    ...(canManageGroups
      ? [{ view: 'churches' as ViewMode, label: 'Grupos / Bandas', icon: Building2 }]
      : []),
    ...(canManageMembers
      ? [{ view: 'users' as ViewMode, label: 'Membros', icon: Users }]
      : []),
  ];

  const moduleTabs = tabs.filter((t) => t.view !== 'workspace');
  const address = church.address?.trim() || '';
  const leader = church.leader?.trim() || '';

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
    ) : (
      'Área de trabalho da igreja'
    );

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
        sigla: form.sigla.trim() || undefined,
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
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <PageHeader
        icon={Church}
        title={church.name}
        description={headerMeta}
        actions={
          canEditChurch && onSaveChurch ? (
            <button
              type="button"
              onClick={openEdit}
              title="Editar"
              aria-label="Editar"
              className="p-2.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-emerald-300 light:text-emerald-800 rounded-button border border-stone-700 light:border-stone-300 transition-all shrink-0"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          ) : undefined
        }
      />

      {!hideTabs && tabs.length > 0 && (
        <div
          className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-stone-800 light:border-stone-200"
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
                onClick={() => onNavigate(view)}
                className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 rounded-t-lg ${
                  selected
                    ? 'border-emerald-500 bg-emerald-500/15 light:bg-emerald-50 text-emerald-200 light:text-emerald-800'
                    : 'border-transparent text-stone-500 light:text-stone-500 hover:text-stone-200 light:hover:text-stone-800 hover:border-stone-600 light:hover:border-stone-300 hover:bg-stone-800/40 light:hover:bg-stone-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    selected
                      ? 'text-emerald-400 light:text-emerald-600'
                      : 'text-stone-600 light:text-stone-400'
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {currentView === 'workspace' ? (
        moduleTabs.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center text-stone-400 space-y-2">
            <Church className="w-10 h-10 text-stone-600 mx-auto" />
            <p className="font-display text-lg text-stone-300">Sem módulos disponíveis</p>
            <p className="text-xs max-w-md mx-auto">
              Você está associado a esta igreja, mas ainda não possui permissão de eventos, grupos ou
              membros. Peça ao administrador para liberar o acesso.
            </p>
          </div>
        ) : (
          <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-2">
            <p className="font-display text-lg text-stone-200">
              Bem-vindo ao workspace de {church.name}
            </p>
            <p className="text-sm text-stone-500 max-w-xl leading-relaxed">
              Use as abas acima para abrir Eventos, Grupos / Bandas ou Membros, conforme as
              permissões da sua conta nesta igreja.
            </p>
          </div>
        )
      ) : (
        children
      )}

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
                  <label className="block text-stone-400 font-semibold mb-1">Sigla</label>
                  <input
                    value={form.sigla}
                    onChange={(e) => setForm((p) => ({ ...p, sigla: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
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
