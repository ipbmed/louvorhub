import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Share2,
  ShieldCheck,
  StickyNote,
  Trash2,
  Unlock,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type {
  MusicGroup,
  MusicGroupMember,
  ScheduleMemberAssignment,
  Song,
  SystemUser,
  WorshipSchedule,
} from '../types';
import { useConfirm } from '@/contexts/ConfirmProvider';
import {
  SCHEDULE_ROLE_OPTIONS,
  getProfileSkills,
  partitionBySkillMatch,
} from '@/constants/skills';
import { ActionButton, Badge, Input, Modal, Select, Textarea, cn } from './ui';

const DECLINE_REASONS = ['Trabalho', 'Viagem', 'Doença/Saúde', 'Compromisso Familiar', 'Estudos'];

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

interface EventTeamPanelProps {
  schedule: WorshipSchedule;
  musicGroups: MusicGroup[];
  systemUsers?: SystemUser[];
  songs: Song[];
  churchName?: string;
  onSave: (schedule: WorshipSchedule) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

/** Equipe de louvor do evento: ensaio, integrantes, presença e observações, editados no lugar. */
export const EventTeamPanel: React.FC<EventTeamPanelProps> = ({
  schedule,
  musicGroups,
  systemUsers = [],
  songs,
  churchName,
  onSave,
  onDelete,
}) => {
  const confirm = useConfirm();
  const [copied, setCopied] = useState(false);

  const [rehearsalEditing, setRehearsalEditing] = useState(false);
  const [rehearsalDate, setRehearsalDate] = useState(schedule.rehearsalDate || '');
  const [rehearsalTime, setRehearsalTime] = useState(schedule.rehearsalTime || '');

  const [newRole, setNewRole] = useState('');
  const [newMemberId, setNewMemberId] = useState('');

  const [notes, setNotes] = useState(schedule.notes || '');
  useEffect(() => setNotes(schedule.notes || ''), [schedule.notes]);

  const [decline, setDecline] = useState<{ index: number; reason: string } | null>(null);

  const group = musicGroups.find((g) => g.id === schedule.musicGroupId);
  const groupMembers = group?.members ?? [];
  const assignments = schedule.assignments;
  const locked = Boolean(schedule.isFinalized);

  const confirmedCount = assignments.filter((a) => a.status === 'confirmed').length;
  const declinedCount = assignments.filter((a) => a.status === 'declined').length;
  const pendingCount = assignments.length - confirmedCount - declinedCount;

  const resolveMemberSkills = (member: MusicGroupMember): string[] =>
    getProfileSkills(systemUsers.find((u) => u.id === member.userId));

  const { suggested, others } = partitionBySkillMatch(groupMembers, newRole, resolveMemberSkills);

  const save = (patch: Partial<WorshipSchedule>) => onSave({ ...schedule, ...patch });

  const saveAssignments = (next: ScheduleMemberAssignment[]) => save({ assignments: next });

  const openRehearsalEditor = () => {
    setRehearsalDate(schedule.rehearsalDate || '');
    setRehearsalTime(schedule.rehearsalTime || '19:00');
    setRehearsalEditing(true);
  };

  const saveRehearsal = async () => {
    if (!rehearsalDate) return;
    await save({ rehearsalDate, rehearsalTime: rehearsalTime || undefined });
    setRehearsalEditing(false);
  };

  const clearRehearsal = () => save({ rehearsalDate: undefined, rehearsalTime: undefined });

  const addMember = async () => {
    const member = groupMembers.find((m) => m.id === newMemberId);
    if (!member || !newRole.trim()) return;
    await saveAssignments([
      ...assignments,
      {
        role: newRole.trim(),
        memberId: member.id,
        userId: member.userId,
        memberName: member.name,
        status: 'pending',
      },
    ]);
    setNewRole('');
    setNewMemberId('');
  };

  const removeMember = (index: number) => saveAssignments(assignments.filter((_, i) => i !== index));

  const setMemberStatus = (index: number, status: 'confirmed' | 'declined', declineReason?: string) =>
    saveAssignments(
      assignments.map((a, i) =>
        i === index
          ? {
              ...a,
              status,
              declineReason: status === 'declined' ? declineReason : undefined,
              updatedAt: new Date().toISOString(),
            }
          : a,
      ),
    );

  const saveNotes = () => {
    if (notes.trim() === (schedule.notes || '').trim()) return;
    void save({ notes: notes.trim() || undefined });
  };

  const toggleFinalize = () => {
    const willFinalize = !schedule.isFinalized;
    void save({
      isFinalized: willFinalize,
      finalizedAt: willFinalize ? new Date().toISOString() : undefined,
    });
  };

  const whatsAppText = () => {
    const dateFormatted = new Date(`${schedule.date}T00:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    let text = `🗓️ *ESCALA DE LOUVOR*\n`;
    if (churchName) text += `⛪ *${churchName}*\n`;
    text += `📅 *Data:* ${dateFormatted}${schedule.time ? ` às ${schedule.time}` : ''}\n`;
    text += `✝️ *Serviço:* ${schedule.serviceType}\n`;
    if (schedule.theme) text += `📖 *Tema:* ${schedule.theme}\n`;
    if (group) text += `🎸 *Grupo/Banda:* ${group.name}\n`;
    if (schedule.rehearsalDate) {
      text += `⏰ *Ensaio:* ${formatShortDate(schedule.rehearsalDate)}${
        schedule.rehearsalTime ? ` às ${schedule.rehearsalTime}` : ''
      }\n`;
    }
    text += `\n👥 *INTEGRANTES ESCALADOS:*\n`;
    text += assignments.length
      ? assignments.map((a) => `• *${a.role}:* ${a.memberName}`).join('\n') + '\n'
      : `_Nenhum integrante definido_\n`;

    const linkedSongs = songs.filter((s) => schedule.songIds.includes(s.id));
    if (linkedSongs.length) {
      text += `\n🎶 *REPERTÓRIO / HINOS:*\n`;
      linkedSongs.forEach((s) => {
        const custom = schedule.customSongs?.find((c) => c.songId === s.id);
        const key = custom?.originalKey || s.originalKey;
        text += `• ${s.songType === 'hino' && s.number ? `Hino nº ${s.number} - ` : ''}${s.title}${
          key ? ` (Tom: ${key})` : ''
        }\n`;
      });
    }
    if (schedule.notes) text += `\n📝 *Observações:* ${schedule.notes}\n`;
    text += `\n_Confirmem presença! Deus abençoe._ 🙏`;
    return text;
  };

  const copyWhatsApp = () => {
    void navigator.clipboard.writeText(whatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const requestConfirmation = (a: ScheduleMemberAssignment) => {
    const dateFormatted = new Date(`${schedule.date}T00:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });
    const msg = `Olá *${a.memberName}*! 👋\nVocê foi escalado(a) para o *${schedule.serviceType}*.\n📅 *Data:* ${dateFormatted}${
      schedule.time ? ` às ${schedule.time}` : ''
    }\n🎸 *Sua função:* ${a.role}\n\nPor favor, confirme se poderá participar. Deus abençoe! 🙏`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const deleteSchedule = async () => {
    const ok = await confirm({
      title: 'Excluir escala',
      message: 'A equipe e as confirmações desta escala serão removidas.',
      confirmLabel: 'Excluir escala',
    });
    if (ok) await onDelete(schedule.id);
  };

  const sectionClass = 'bg-surface border border-line rounded-2xl shadow-card';

  return (
    <div className="space-y-4">
      <section className={cn(sectionClass, 'p-4 flex flex-wrap items-center gap-3')}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {locked ? (
            <Badge tone="brand" className="text-[11px] py-1">
              <Lock className="w-3 h-3" />
              Escala finalizada
              {schedule.finalizedAt && ` · ${new Date(schedule.finalizedAt).toLocaleDateString('pt-BR')}`}
            </Badge>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{confirmedCount} confirmados</Badge>
              {pendingCount > 0 && <Badge tone="warning">{pendingCount} pendentes</Badge>}
              {declinedCount > 0 && <Badge tone="danger">{declinedCount} indisponíveis</Badge>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            variant={copied ? 'secondary' : 'light'}
            icon={copied ? Check : Share2}
            collapseLabel
            onClick={copyWhatsApp}
            title="Copiar escala para o WhatsApp"
          >
            {copied ? 'Copiado' : 'WhatsApp'}
          </ActionButton>
          <ActionButton
            variant={locked ? 'light' : 'primary'}
            icon={locked ? Unlock : ShieldCheck}
            onClick={toggleFinalize}
          >
            {locked ? 'Reabrir' : 'Finalizar escala'}
          </ActionButton>
          <ActionButton
            variant="danger"
            icon={Trash2}
            onClick={() => void deleteSchedule()}
            aria-label="Excluir escala"
            title="Excluir escala"
          />
        </div>
      </section>

      <section className={cn(sectionClass, 'p-4')}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-info-soft text-info-text flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Ensaio</p>
            {!rehearsalEditing && (
              <p className={cn('text-sm', schedule.rehearsalDate ? 'font-semibold text-fg' : 'text-fg-muted')}>
                {schedule.rehearsalDate ? (
                  <span className="first-letter:uppercase inline-block">
                    {formatShortDate(schedule.rehearsalDate)}
                    {schedule.rehearsalTime && ` às ${schedule.rehearsalTime}`}
                  </span>
                ) : (
                  'Não marcado'
                )}
              </p>
            )}
          </div>
          {!rehearsalEditing &&
            (schedule.rehearsalDate ? (
              <div className="flex items-center gap-2">
                <ActionButton variant="light" icon={Pencil} onClick={openRehearsalEditor} aria-label="Alterar ensaio" title="Alterar ensaio" />
                <ActionButton variant="light" icon={X} onClick={() => void clearRehearsal()} aria-label="Remover ensaio" title="Remover ensaio" />
              </div>
            ) : (
              <ActionButton variant="secondary" icon={Plus} onClick={openRehearsalEditor}>
                Marcar ensaio
              </ActionButton>
            ))}
        </div>
        {rehearsalEditing && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Input
              type="date"
              value={rehearsalDate}
              onChange={(e) => setRehearsalDate(e.target.value)}
              max={schedule.date || undefined}
              aria-label="Data do ensaio"
              className="w-auto flex-1 min-w-[10rem]"
              autoFocus
            />
            <Input
              type="time"
              value={rehearsalTime}
              onChange={(e) => setRehearsalTime(e.target.value)}
              aria-label="Horário do ensaio"
              className="w-auto"
            />
            <ActionButton variant="light" onClick={() => setRehearsalEditing(false)}>
              Cancelar
            </ActionButton>
            <ActionButton variant="primary" icon={Check} onClick={() => void saveRehearsal()} disabled={!rehearsalDate}>
              Salvar
            </ActionButton>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <div className="px-4 pt-4 pb-3 flex flex-wrap items-center gap-2 border-b border-line">
          <h3 className="text-sm font-bold text-fg flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-brand-text" />
            Integrantes
            <span className="text-fg-subtle font-semibold">{assignments.length}</span>
          </h3>
          {musicGroups.length > 0 && (
            <Select
              value={schedule.musicGroupId || ''}
              onChange={(e) => void save({ musicGroupId: e.target.value || undefined })}
              aria-label="Grupo musical"
              className="w-auto h-9 py-0 text-xs"
              disabled={locked}
            >
              <option value="">Sem grupo</option>
              {musicGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {assignments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-muted text-center">Ninguém escalado ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {assignments.map((a, i) => {
              const isConfirmed = a.status === 'confirmed';
              const isDeclined = a.status === 'declined';
              return (
                <li key={a.id || `${a.role}-${a.memberName}-${i}`} className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        isConfirmed ? 'bg-brand' : isDeclined ? 'bg-danger' : 'bg-warning',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg truncate">{a.memberName}</p>
                      <p className="text-xs text-fg-muted truncate">
                        {a.role}
                        {isDeclined && a.declineReason && (
                          <span className="text-danger-text"> · Indisponível: {a.declineReason}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <ActionButton
                      variant={isConfirmed ? 'primary' : 'light'}
                      icon={UserCheck}
                      collapseLabel
                      aria-pressed={isConfirmed}
                      onClick={() => void setMemberStatus(i, 'confirmed')}
                      title="Pode participar"
                    >
                      Posso
                    </ActionButton>
                    <ActionButton
                      variant={isDeclined ? 'danger' : 'light'}
                      icon={UserX}
                      collapseLabel
                      aria-pressed={isDeclined}
                      onClick={() => setDecline({ index: i, reason: a.declineReason || '' })}
                      title="Não pode participar"
                    >
                      Não posso
                    </ActionButton>
                    <ActionButton
                      variant="light"
                      icon={MessageSquare}
                      onClick={() => requestConfirmation(a)}
                      aria-label="Pedir confirmação pelo WhatsApp"
                      title="Pedir confirmação pelo WhatsApp"
                    />
                    {!locked && (
                      <ActionButton
                        variant="light"
                        icon={X}
                        onClick={() => void removeMember(i)}
                        aria-label={`Remover ${a.memberName}`}
                        title="Remover da escala"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!locked && (
          <div className="px-4 py-3 border-t border-line bg-surface-2/60 rounded-b-2xl">
            {!group ? (
              <p className="text-xs text-fg-muted">Escolha o grupo musical para adicionar pessoas.</p>
            ) : groupMembers.length === 0 ? (
              <p className="text-xs text-warning-text">
                O grupo {group.name} ainda não tem integrantes. Cadastre-os em Igrejas.
              </p>
            ) : (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addMember();
                }}
              >
                <datalist id="event-team-roles">
                  {SCHEDULE_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
                <Input
                  list="event-team-roles"
                  placeholder="Função (ex.: Bateria)"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  aria-label="Função"
                  className="w-auto flex-1 min-w-[9rem] h-9 py-0 text-sm"
                />
                <Select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  aria-label="Pessoa"
                  className="w-auto flex-[2] min-w-[11rem] h-9 py-0 text-sm"
                >
                  <option value="">Escolher pessoa…</option>
                  {suggested.length > 0 && (
                    <optgroup label={newRole.trim() ? `Sugeridos · ${newRole.trim()}` : 'Sugeridos'}>
                      {suggested.map((m) => (
                        <option key={`sug-${m.id}`} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={suggested.length > 0 ? 'Outros do grupo' : 'Integrantes do grupo'}>
                    {others.map((m) => (
                      <option key={`oth-${m.id}`} value={m.id}>
                        {m.name}
                        {resolveMemberSkills(m).length ? ` · ${resolveMemberSkills(m).join(', ')}` : ''}
                      </option>
                    ))}
                  </optgroup>
                </Select>
                <ActionButton
                  type="submit"
                  variant="primary"
                  icon={Plus}
                  disabled={!newRole.trim() || !newMemberId}
                >
                  Adicionar
                </ActionButton>
              </form>
            )}
          </div>
        )}
      </section>

      <section className={cn(sectionClass, 'p-4')}>
        <label htmlFor="event-team-notes" className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 mb-2">
          <StickyNote className="w-3.5 h-3.5" />
          Instruções para a equipe
        </label>
        <Textarea
          id="event-team-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Ex.: Chegar 45 minutos antes para a passagem de som."
          className="min-h-0"
        />
      </section>

      <Modal
        open={Boolean(decline)}
        onClose={() => setDecline(null)}
        size="sm"
        icon={UserX}
        tone="danger"
        title={decline ? `Indisponibilidade de ${assignments[decline.index]?.memberName ?? ''}` : ''}
        footer={
          <>
            <ActionButton variant="light" onClick={() => setDecline(null)}>
              Cancelar
            </ActionButton>
            <ActionButton
              variant="danger"
              icon={UserX}
              onClick={() => {
                if (decline) void setMemberStatus(decline.index, 'declined', decline.reason.trim() || undefined);
                setDecline(null);
              }}
            >
              Marcar indisponível
            </ActionButton>
          </>
        }
      >
        {decline && (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">Motivo (opcional):</p>
            <div className="flex flex-wrap gap-1.5">
              {DECLINE_REASONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDecline({ ...decline, reason: opt })}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    decline.reason === opt
                      ? 'bg-danger-soft text-danger-text border-danger-line'
                      : 'bg-surface-2 text-fg-muted border-line hover:text-fg',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Textarea
              rows={2}
              value={decline.reason}
              onChange={(e) => setDecline({ ...decline, reason: e.target.value })}
              placeholder="Descreva o motivo…"
              className="min-h-0"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
