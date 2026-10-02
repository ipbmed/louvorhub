import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarPlus,
  Church,
  ChevronRight,
  Edit3,
  LayoutGrid,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react';
import type { Church as ChurchType, ChurchEvent, ViewMode } from '@/types';
import { PageHeader } from './PageHeader';
import { Alert, Button, EmptyState, Field, IconButton, Input, Modal, cn } from './ui';

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
  description: string;
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

function formatEventDate(date: string, opts: Intl.DateTimeFormatOptions) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', opts);
}

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

  const tabs: WorkspaceTab[] = [
    { view: 'workspace', label: 'Início', description: 'Resumo da igreja', icon: LayoutGrid },
    ...(canAccessEvents
      ? [
          {
            view: 'events' as ViewMode,
            label: 'Eventos',
            description: 'Cultos, escalas, liturgia e repertório',
            icon: Calendar,
          },
        ]
      : []),
    ...(canManageGroups
      ? [
          {
            view: 'churches' as ViewMode,
            label: 'Bandas',
            description: 'Grupos e equipes de louvor',
            icon: Building2,
          },
        ]
      : []),
    ...(canManageMembers
      ? [
          {
            view: 'users' as ViewMode,
            label: 'Membros',
            description: 'Pessoas, convites e permissões',
            icon: Users,
          },
        ]
      : []),
  ];

  const moduleTabs = tabs.filter((t) => t.view !== 'workspace');
  const address = church.address?.trim() || '';
  const leader = church.leader?.trim() || '';
  const phone = church.phone?.trim() || '';

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
            <MapPin className="w-3.5 h-3.5 shrink-0 text-fg-subtle" />
            <span className="truncate">{address}</span>
          </span>
        )}
        {leader && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 shrink-0 text-fg-subtle" />
            <span>
              Líder: <span className="font-semibold text-fg">{leader}</span>
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

  const canEdit = Boolean(canEditChurch && onSaveChurch);

  return (
    <div className="w-full animate-in fade-in duration-300">
      {/* Desktop / tablet: cabeçalho completo (rola junto com a página) */}
      <div className="hidden sm:block">
        <PageHeader
          icon={Church}
          title={church.name}
          description={headerMeta}
          onIconClick={canEdit ? openEdit : undefined}
          iconTitle={canEdit ? 'Editar igreja' : undefined}
          iconBadge={canEdit ? Edit3 : undefined}
          onTitleClick={() => onNavigate('workspace')}
          titleTitle="Ir para Início"
          actions={
            <>
              {canEdit && (
                <Button variant="secondary" size="sm" icon={Edit3} onClick={openEdit}>
                  Editar
                </Button>
              )}
              <IconButton
                icon={ArrowLeft}
                label={onBack ? backLabel || 'Voltar' : 'Voltar ao catálogo'}
                onClick={() => (onBack ? onBack() : onNavigate('public'))}
              />
            </>
          }
        />
      </div>

      {tabs.length > 1 && (
        <div
          className="sticky top-14 sm:top-16 z-20 w-full border-b border-line bg-surface/95 backdrop-blur-md"
          role="tablist"
          aria-label="Navegação da igreja"
        >
          <div className="flex w-full sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
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
                  className={cn(
                    'relative flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 text-[11px] sm:text-sm transition-colors !rounded-none border-b-2 touch-manipulation',
                    selected
                      ? 'border-brand text-brand-text font-bold'
                      : 'border-transparent text-fg-subtle font-semibold hover:text-fg hover:bg-muted/50',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      selected ? 'text-brand-text' : 'text-fg-subtle',
                    )}
                  />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={cn('pt-3 sm:pt-5 space-y-3 sm:space-y-4', 'px-2.5 sm:px-6 lg:px-8')}>
        {currentView === 'workspace' ? (
          moduleTabs.length === 0 ? (
            <EmptyState
              icon={Church}
              title={church.name}
              description="Você está associado a esta igreja, mas ainda não possui permissão de eventos, grupos ou membros. Peça ao administrador para liberar o acesso."
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Mobile: título + contato */}
              <div className="sm:hidden flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-fg tracking-tight leading-tight">
                    {church.name}
                  </h2>
                  {(address || leader) && (
                    <p className="text-[11px] text-fg-subtle mt-0.5 truncate">
                      {[address, leader && `Líder: ${leader}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {canEdit && <IconButton icon={Edit3} label="Editar igreja" size="sm" onClick={openEdit} />}
              </div>

              {/* Atalhos dos módulos */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {moduleTabs.map(({ view, label, description, icon: Icon }) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => onNavigate(view)}
                    className="ui-card group text-left p-3.5 sm:p-4 flex items-center sm:items-start gap-3 hover:border-brand-line hover:shadow-md transition-all touch-manipulation !rounded-2xl"
                  >
                    <span className="w-10 h-10 rounded-xl bg-brand-soft border border-brand-line text-brand-text flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-brand-fg transition-colors">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-fg">{label}</span>
                      <span className="block text-[11px] text-fg-muted leading-snug mt-0.5">
                        {description}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0 self-center group-hover:text-brand-text group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>

              {canAccessEvents && (
                <section className="ui-card p-3.5 sm:p-4 !rounded-2xl">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-text" />
                      Próximos eventos
                    </h3>
                    <Button
                      variant="ghost"
                      size="xs"
                      iconRight={ChevronRight}
                      onClick={() => onNavigate('events')}
                      className="!text-brand-text"
                    >
                      Ver todos
                    </Button>
                  </div>

                  {upcomingEvents.length === 0 ? (
                    <EmptyState
                      compact
                      icon={CalendarPlus}
                      title="Nenhum evento próximo"
                      description="Crie um culto ou ensaio para montar a escala, a liturgia e o repertório."
                      action={
                        <Button size="sm" icon={CalendarPlus} onClick={() => onNavigate('events')}>
                          Ir para eventos
                        </Button>
                      }
                      className="!border-dashed !shadow-none"
                    />
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
                            className="w-full text-left flex items-center gap-3 rounded-xl border border-line hover:border-brand-line bg-surface-2/60 hover:bg-surface px-3 py-2.5 transition-colors touch-manipulation"
                          >
                            <div className="shrink-0 w-12 text-center">
                              <p className="text-[10px] font-bold uppercase text-brand-text leading-none">
                                {formatEventDate(ev.date, { weekday: 'short' })}
                              </p>
                              <p className="text-sm font-display font-bold text-fg leading-tight mt-0.5">
                                {formatEventDate(ev.date, { day: '2-digit', month: 'short' })}
                              </p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-fg truncate">{ev.title}</p>
                              <p className="text-[11px] text-fg-subtle truncate">
                                {ev.time ? ev.time.slice(0, 5) : 'Horário a definir'}
                                {ev.theme ? ` · ${ev.theme}` : ''}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {(phone || address) && (
                <section className="ui-card p-3.5 sm:p-4 !rounded-2xl sm:hidden">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                    Contato
                  </h3>
                  <div className="space-y-1.5 text-xs text-fg-muted">
                    {address && (
                      <p className="inline-flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-fg-subtle" />
                        {address}
                      </p>
                    )}
                    {phone && (
                      <p className="inline-flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-fg-subtle" />
                        <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-brand-text font-semibold">
                          {phone}
                        </a>
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )
        ) : (
          children
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        locked={saving}
        icon={Church}
        title="Editar igreja"
        subtitle="Dados exibidos no cabeçalho e nos links públicos."
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="church-edit-form" loading={saving}>
              Salvar alterações
            </Button>
          </>
        }
      >
        <form id="church-edit-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {errorMsg && <Alert tone="danger">{errorMsg}</Alert>}

          <Field label="Nome da igreja" required>
            {(id) => (
              <Input
                id={id}
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade" required>
              {(id) => (
                <Input
                  id={id}
                  required
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              )}
            </Field>
            <Field label="Sigla" required hint="Aparece no app e no link público.">
              {(id) => (
                <Input
                  id={id}
                  required
                  value={form.sigla}
                  onChange={(e) => setForm((p) => ({ ...p, sigla: e.target.value }))}
                  placeholder="Ex: IPM"
                  maxLength={20}
                  className="uppercase"
                />
              )}
            </Field>
          </div>
          <Field label="Endereço">
            {(id) => (
              <Input
                id={id}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Rua, número, bairro"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Líder / pastor">
              {(id) => (
                <Input
                  id={id}
                  value={form.leader}
                  onChange={(e) => setForm((p) => ({ ...p, leader: e.target.value }))}
                />
              )}
            </Field>
            <Field label="Telefone">
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              )}
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
};
