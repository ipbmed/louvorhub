import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CalendarPlus,
  Church,
  ChevronRight,
  Edit3,
  MapPin,
  Phone,
  User,
  UsersRound,
} from 'lucide-react';
import type { Church as ChurchType, ChurchEvent, ViewMode } from '@/types';
import { todayStr } from '@/utils/dateLabels';
import { PageHeader } from './PageHeader';
import { EventCard } from './EventCard';
import { Alert, Button, EmptyState, Field, IconButton, Input, Modal, Tabs, type TabItem } from './ui';

export const WORKSPACE_VIEWS: ViewMode[] = ['workspace', 'churches', 'users'];

type WorkspaceView = 'workspace' | 'churches' | 'users';

interface ChurchWorkspaceProps {
  church: ChurchType;
  currentView: ViewMode;
  canAccessEvents: boolean;
  canManageGroups: boolean;
  canManageMembers: boolean;
  canEditChurch?: boolean;
  onSaveChurch?: (church: ChurchType) => void | Promise<void>;
  onNavigate: (view: ViewMode) => void;
  /** Voltar para a lista de igrejas. */
  onBack: () => void;
  /** Incrementa para abrir o modal de edição a partir de outra tela. */
  editRequestKey?: number;
  events?: ChurchEvent[];
  groupsCount?: number;
  membersCount?: number;
  groupName?: (groupId?: string) => string | undefined;
  onOpenEvent?: (eventId: string) => void;
  children?: React.ReactNode;
}

type ChurchForm = {
  name: string;
  city: string;
  address: string;
  leader: string;
  phone: string;
  sigla: string;
  color: string;
};

const DEFAULT_COLOR = '#4f46e5';
const CHURCH_COLORS = ['#4f46e5', '#0d9488', '#db2777', '#ea580c', '#7c3aed', '#0284c7', '#16a34a', '#ca8a04'];

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
  editRequestKey = 0,
  events = [],
  groupsCount,
  membersCount,
  groupName,
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
    color: DEFAULT_COLOR,
  });

  const color = church.color || DEFAULT_COLOR;
  const address = church.address?.trim() || '';
  const leader = church.leader?.trim() || '';
  const phone = church.phone?.trim() || '';

  const upcomingEvents = useMemo(() => {
    const today = todayStr();
    return events
      .filter((ev) => ev.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  }, [events]);

  const tabs: TabItem<WorkspaceView>[] = [
    { id: 'workspace', label: 'Eventos', icon: Calendar, count: canAccessEvents ? upcomingEvents.length : undefined },
    ...(canManageGroups ? [{ id: 'churches' as const, label: 'Grupos', icon: Building2, count: groupsCount }] : []),
    ...(canManageMembers ? [{ id: 'users' as const, label: 'Equipe', icon: UsersRound, count: membersCount }] : []),
  ];

  const openEdit = () => {
    setForm({
      name: church.name || '',
      city: church.city || '',
      address: church.address || '',
      leader: church.leader || '',
      phone: church.phone || '',
      sigla: church.sigla || '',
      color: church.color || DEFAULT_COLOR,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  useEffect(() => {
    if (!editRequestKey) return;
    if (!canEditChurch || !onSaveChurch) return;
    openEdit();
    // Trigger externo: reabre o modal a cada incremento da chave
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
  const mark = church.sigla?.trim().slice(0, 4).toUpperCase();

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300">
      <PageHeader
        title={church.name}
        description={
          church.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {church.city}
            </span>
          ) : undefined
        }
        onBack={onBack}
        backLabel="Voltar para Igrejas"
        actions={
          canEdit ? (
            <IconButton
              icon={Edit3}
              label="Editar igreja"
              variant="ghost"
              onClick={openEdit}
              className="bg-surface shadow-card"
            />
          ) : undefined
        }
      />

      <div
        className="rounded-[22px] p-5 text-white shadow-card-lg relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, black))` }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-base font-extrabold shrink-0">
            {mark || <Church className="w-6 h-6" />}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight truncate">{church.name}</p>
            {leader && (
              <p className="text-sm text-white/85 mt-0.5 inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {leader}
              </p>
            )}
          </div>
        </div>
        {(address || phone) && (
          <div className="relative mt-4 flex flex-col gap-1.5 text-[13px] text-white/90">
            {address && (
              <span className="inline-flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {address}
              </span>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {phone}
              </a>
            )}
          </div>
        )}
      </div>

      {tabs.length > 1 && (
        <Tabs
          ariaLabel="Seções da igreja"
          value={(WORKSPACE_VIEWS.includes(currentView) ? currentView : 'workspace') as WorkspaceView}
          onChange={(v) => onNavigate(v)}
          tabs={tabs}
        />
      )}

      <div className="space-y-3">
        {currentView === 'workspace' ? (
          !canAccessEvents ? (
            <EmptyState
              compact
              icon={Church}
              title="Sem acesso à agenda"
              description="Você participa desta igreja, mas ainda não tem permissão para ver os eventos. Peça ao administrador para liberar o acesso."
            />
          ) : upcomingEvents.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarPlus}
              title="Nenhum evento próximo"
              description="Crie um culto ou ensaio para montar a escala, a liturgia e o repertório."
              action={
                <Button size="sm" icon={CalendarPlus} onClick={() => onNavigate('events')}>
                  Abrir agenda
                </Button>
              }
            />
          ) : (
            <>
              {upcomingEvents.slice(0, 8).map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  churchName={church.sigla || undefined}
                  churchColor={color}
                  groupName={groupName?.(ev.musicGroupId)}
                  onOpen={() => onOpenEvent?.(ev.id)}
                />
              ))}
              <Button variant="secondary" block iconRight={ChevronRight} onClick={() => onNavigate('events')}>
                Ver agenda completa
              </Button>
            </>
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
          <div>
            <p className="ui-label">Cor da igreja</p>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Cor da igreja">
              {CHURCH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.color === c}
                  aria-label={c}
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className="w-8 h-8 !rounded-full ring-offset-2 ring-offset-surface transition-shadow"
                  style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}
                />
              ))}
              <label className="w-8 h-8 rounded-full border border-dashed border-line-strong flex items-center justify-center cursor-pointer overflow-hidden relative" title="Outra cor">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-fg-subtle">+</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
