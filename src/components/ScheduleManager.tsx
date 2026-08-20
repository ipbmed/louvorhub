import React, { useEffect, useMemo, useState } from 'react';
import { 
  WorshipSchedule, 
  Church, 
  MusicGroup, 
  MusicGroupMember,
  Song, 
  ScheduleMemberAssignment,
  ScheduleSongCustomization,
  SystemUser
} from '../types';
import { ScheduleSongEditorModal } from './ScheduleSongEditorModal';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Building2, 
  Users, 
  Share2, 
  Printer, 
  AlertCircle, 
  Music, 
  FileText,
  UserCheck,
  Copy,
  Check,
  XCircle,
  Lock,
  Unlock,
  ShieldCheck,
  CalendarDays,
  UserX,
  MessageSquare,
  HelpCircle,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Repeat,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';
import {
  SCHEDULE_ROLE_OPTIONS,
  getProfileSkills,
  partitionBySkillMatch,
} from '@/constants/skills';

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildOccurrenceDates(startDate: string, count: number, intervalDays: number): string[] {
  const safeCount = Math.min(52, Math.max(1, Math.floor(count)));
  const safeInterval = Math.min(365, Math.max(1, Math.floor(intervalDays)));
  return Array.from({ length: safeCount }, (_, i) =>
    addDaysToDateStr(startDate, i * safeInterval)
  );
}

interface ScheduleManagerProps {
  schedules: WorshipSchedule[];
  churches: Church[];
  musicGroups: MusicGroup[];
  songs: Song[];
  systemUsers?: SystemUser[];
  /** Igreja ativa do menu — lista e formulário ficam nesse escopo */
  activeChurchId?: string;
  /** Dentro do detalhe do evento: só a escala, sem calendário/cabeçalho */
  embedded?: boolean;
  onSaveSchedule: (schedule: WorshipSchedule | WorshipSchedule[]) => void | Promise<void>;
  onDeleteSchedule: (id: string) => void;
  onSelectSong?: (song: Song, options?: { eventSongId?: string }) => void;
  onOpenSetlist?: (setlistId: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  schedules,
  churches,
  musicGroups,
  songs,
  systemUsers = [],
  activeChurchId,
  embedded = false,
  onSaveSchedule,
  onDeleteSchedule,
  onSelectSong,
  onOpenSetlist,
}) => {
  const [displayMode, setDisplayMode] = useState<'month' | 'list'>(embedded ? 'list' : 'month');
  const [listScope, setListScope] = useState<'agenda' | 'all'>(embedded ? 'all' : 'agenda');
  const [filterChurchId, setFilterChurchId] = useState<string>(activeChurchId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(() =>
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (activeChurchId) setFilterChurchId(activeChurchId);
  }, [activeChurchId]);
  const [copiedScheduleId, setCopiedScheduleId] = useState<string | null>(null);

  // Member decline reason modal state
  const [declineModal, setDeclineModal] = useState<{
    isOpen: boolean;
    schedule: WorshipSchedule | null;
    assignmentIndex: number;
    memberName: string;
    reason: string;
  }>({
    isOpen: false,
    schedule: null,
    assignmentIndex: -1,
    memberName: '',
    reason: '',
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorshipSchedule | null>(null);

  // Form State
  const [formChurchId, setFormChurchId] = useState('');
  const [formMusicGroupId, setFormMusicGroupId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('19:00');
  const [formServiceType, setFormServiceType] = useState('Culto Dominical de Celebração');
  const [formTheme, setFormTheme] = useState('');
  const [formRehearsalDate, setFormRehearsalDate] = useState('');
  const [formRehearsalTime, setFormRehearsalTime] = useState('18:00');
  const [formStatus, setFormStatus] = useState<'pending' | 'confirmed' | 'completed'>('confirmed');
  const [formNotes, setFormNotes] = useState('');
  
  const [formAssignments, setFormAssignments] = useState<ScheduleMemberAssignment[]>([]);
  const [formCustomSongs, setFormCustomSongs] = useState<ScheduleSongCustomization[]>([]);
  const [formRepeatEnabled, setFormRepeatEnabled] = useState(false);
  const [formRepeatCount, setFormRepeatCount] = useState(4);
  const [formRepeatIntervalDays, setFormRepeatIntervalDays] = useState(7);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Active Song customization modal state
  const [scheduleSongToEdit, setScheduleSongToEdit] = useState<{
    schedule: WorshipSchedule;
    song: Song;
    customization: ScheduleSongCustomization | null;
  } | null>(null);

  // Handle updating member status
  const handleUpdateMemberStatus = (
    sched: WorshipSchedule, 
    assignmentIndex: number, 
    status: 'confirmed' | 'declined' | 'pending',
    declineReason?: string
  ) => {
    const updatedAssignments = [...sched.assignments];
    updatedAssignments[assignmentIndex] = {
      ...updatedAssignments[assignmentIndex],
      status,
      declineReason: status === 'declined' ? (declineReason || updatedAssignments[assignmentIndex].declineReason) : undefined,
      updatedAt: new Date().toISOString(),
    };

    const updatedSched: WorshipSchedule = {
      ...sched,
      assignments: updatedAssignments,
    };

    onSaveSchedule(updatedSched);
  };

  // Handle leader finalization
  const handleToggleFinalizeSchedule = (sched: WorshipSchedule) => {
    const willFinalize = !sched.isFinalized;
    const updatedSched: WorshipSchedule = {
      ...sched,
      isFinalized: willFinalize,
      finalizedAt: willFinalize ? new Date().toISOString() : undefined,
      status: willFinalize ? 'confirmed' : sched.status,
    };
    onSaveSchedule(updatedSched);
  };

  // Filtered schedules list
  const filteredSchedules = schedules.filter(s => {
    if (filterChurchId !== 'all' && s.churchId !== filterChurchId) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Upcoming agenda schedules (today or future)
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingSchedules = filteredSchedules.filter(s => s.date >= todayStr);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, WorshipSchedule[]>();
    for (const s of filteredSchedules) {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [filteredSchedules]);

  const calendarCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startOffset);
    const cells: { dateStr: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
      cells.push({
        dateStr,
        day: d.getDate(),
        inMonth: d.getMonth() === month,
      });
    }
    return cells;
  }, [calendarCursor]);

  const monthLabel = calendarCursor.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const schedulesToShow = embedded
    ? filteredSchedules
    : displayMode === 'month'
      ? selectedDay
        ? filteredSchedules.filter((s) => s.date === selectedDay)
        : []
      : listScope === 'agenda'
        ? upcomingSchedules
        : filteredSchedules;

  // Modal Open Handlers
  const handleOpenNewModal = (prefillDate?: string) => {
    setEditingSchedule(null);
    const initialChurchId = activeChurchId || churches[0]?.id || '';
    const churchMusicGroups = musicGroups.filter(g => g.churchId === initialChurchId);
    
    setFormChurchId(initialChurchId);
    setFormMusicGroupId(churchMusicGroups.length > 0 ? churchMusicGroups[0].id : '');
    setFormDate(prefillDate || new Date().toISOString().slice(0, 10));
    setFormTime('19:00');
    setFormServiceType('Culto Dominical de Celebração');
    setFormTheme('');
    setFormRehearsalDate('');
    setFormRehearsalTime('18:00');
    setFormStatus('confirmed');
    setFormNotes('');
    setFormAssignments([]);
    setFormCustomSongs([]);
    setFormRepeatEnabled(false);
    setFormRepeatCount(4);
    setFormRepeatIntervalDays(7);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sched: WorshipSchedule) => {
    setEditingSchedule(sched);
    setFormChurchId(sched.churchId);
    setFormMusicGroupId(sched.musicGroupId || '');
    setFormDate(sched.date);
    setFormTime(sched.time || '19:00');
    setFormServiceType(sched.serviceType);
    setFormTheme(sched.theme || '');
    setFormRehearsalDate(sched.rehearsalDate || '');
    setFormRehearsalTime(sched.rehearsalTime || '');
    setFormStatus(sched.status);
    setFormNotes(sched.notes || '');
    setFormAssignments([...sched.assignments]);
    setFormCustomSongs(sched.customSongs ? [...sched.customSongs] : []);
    setFormRepeatEnabled(false);
    setFormRepeatCount(4);
    setFormRepeatIntervalDays(7);
    setIsModalOpen(true);
  };

  const recurrencePreviewDates = useMemo(() => {
    if (!formDate || !formRepeatEnabled || editingSchedule) return [];
    return buildOccurrenceDates(formDate, formRepeatCount, formRepeatIntervalDays);
  }, [formDate, formRepeatEnabled, formRepeatCount, formRepeatIntervalDays, editingSchedule]);

  // Save Song day customization
  const handleSaveSongCustomization = (customization: ScheduleSongCustomization) => {
    if (!scheduleSongToEdit) return;
    const targetSched = scheduleSongToEdit.schedule;

    const existingCustoms = targetSched.customSongs || [];
    const filtered = existingCustoms.filter(c => c.songId !== customization.songId);
    const updatedCustoms = [...filtered, customization];

    if (isModalOpen && editingSchedule?.id === targetSched.id) {
      setFormCustomSongs(updatedCustoms);
    }

    const updatedSched: WorshipSchedule = {
      ...targetSched,
      customSongs: updatedCustoms,
    };

    onSaveSchedule(updatedSched);
  };

  // Reset Song day customization
  const handleResetSongCustomization = (songId: string) => {
    if (!scheduleSongToEdit) return;
    const targetSched = scheduleSongToEdit.schedule;

    const existingCustoms = targetSched.customSongs || [];
    const updatedCustoms = existingCustoms.filter(c => c.songId !== songId);

    if (isModalOpen && editingSchedule?.id === targetSched.id) {
      setFormCustomSongs(updatedCustoms);
    }

    const updatedSched: WorshipSchedule = {
      ...targetSched,
      customSongs: updatedCustoms,
    };

    onSaveSchedule(updatedSched);
  };

  const selectedFormMusicGroup = useMemo(
    () => musicGroups.find((g) => g.id === formMusicGroupId),
    [musicGroups, formMusicGroupId],
  );

  const formGroupMembers = selectedFormMusicGroup?.members ?? [];

  const resolveMemberSkills = (member: MusicGroupMember): string[] => {
    if (!member.userId) return [];
    const user = systemUsers.find((u) => u.id === member.userId);
    return getProfileSkills(user);
  };

  // Só associa o grupo; papéis e pessoas são escolhidos na escala
  const handlePopulateAssignmentsFromMusicGroup = (musicGroupId: string) => {
    setFormMusicGroupId(musicGroupId);
    setFormAssignments([]);
  };

  const handleAssignmentRoleChange = (index: number, role: string) => {
    setFormAssignments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], role };
      return updated;
    });
  };

  const handleAssignmentMemberChange = (index: number, memberId: string) => {
    setFormAssignments((prev) => {
      const updated = [...prev];
      const member = formGroupMembers.find((m) => m.id === memberId);
      if (!member) {
        updated[index] = {
          ...updated[index],
          memberId: undefined,
          userId: undefined,
          memberName: '',
        };
        return updated;
      }
      updated[index] = {
        ...updated[index],
        memberId: member.id,
        userId: member.userId,
        memberName: member.name,
      };
      return updated;
    });
  };

  const handleAddAssignmentRow = () => {
    setFormAssignments((prev) => [...prev, { role: 'Vocal', memberName: '' }]);
  };

  const handleRemoveAssignmentRow = (index: number) => {
    setFormAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChurchId || !formDate || isSavingBatch) return;

    const baseAssignments = formAssignments.filter((a) => a.memberName.trim() !== '');
    const churchId = activeChurchId || formChurchId;
    const nowIso = new Date().toISOString();

    const buildSchedule = (date: string, rehearsalDate: string | undefined, id: string, createdAt: string): WorshipSchedule => ({
      id,
      churchId,
      eventId: editingSchedule?.eventId,
      musicGroupId: formMusicGroupId,
      date,
      time: formTime,
      serviceType: formServiceType,
      theme: formTheme,
      rehearsalDate: rehearsalDate || undefined,
      rehearsalTime: formRehearsalTime,
      assignments: baseAssignments.map((a) => ({
        ...a,
        status: a.status || 'pending',
        declineReason: a.status === 'declined' ? a.declineReason : undefined,
      })),
      // Músicas ficam no repertório associado — não editar no cadastro da escala
      songIds: editingSchedule?.songIds ?? [],
      customSongs: editingSchedule ? formCustomSongs : [],
      setlistId: editingSchedule?.setlistId,
      notes: formNotes,
      status: formStatus,
      createdAt,
    });

    if (editingSchedule) {
      onSaveSchedule(
        buildSchedule(
          formDate,
          formRehearsalDate || undefined,
          editingSchedule.id,
          editingSchedule.createdAt
        )
      );
      setIsModalOpen(false);
      return;
    }

    const dates =
      formRepeatEnabled && formRepeatCount > 1
        ? buildOccurrenceDates(formDate, formRepeatCount, formRepeatIntervalDays)
        : [formDate];

    const batch = dates.map((date, index) => {
      const dayOffset = index * (formRepeatEnabled ? Math.max(1, formRepeatIntervalDays) : 0);
      const rehearsalDate = formRehearsalDate
        ? addDaysToDateStr(formRehearsalDate, dayOffset)
        : undefined;
      return buildSchedule(date, rehearsalDate, '', nowIso);
    });

    try {
      setIsSavingBatch(true);
      await onSaveSchedule(batch.length === 1 ? batch[0] : batch);
      setIsModalOpen(false);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // WhatsApp text formatting
  const generateWhatsAppText = (sched: WorshipSchedule) => {
    const church = churches.find(c => c.id === sched.churchId);
    const musicGroup = musicGroups.find(g => g.id === sched.musicGroupId);
    const dateFormatted = new Date(sched.date + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    let text = `🗓️ *ESCALA DE LOUVOR*\n`;
    if (church) text += `⛪ *${church.name}*\n`;
    text += `📅 *Data:* ${dateFormatted} às ${sched.time || '19:00'}\n`;
    text += `✝️ *Serviço:* ${sched.serviceType}\n`;
    if (sched.theme) text += `📖 *Tema:* ${sched.theme}\n`;
    if (musicGroup) text += `🎸 *Grupo/Banda:* ${musicGroup.name}\n`;
    if (sched.rehearsalDate) text += `⏰ *Ensaio:* ${sched.rehearsalDate} às ${sched.rehearsalTime || ''}\n`;
    
    text += `\n👥 *INTEGRANTES ESCALADOS:*\n`;
    if (sched.assignments.length === 0) {
      text += `_Nenhum integrante definido_\n`;
    } else {
      sched.assignments.forEach(a => {
        text += `• *${a.role}:* ${a.memberName}\n`;
      });
    }

    const linkedSongs = songs.filter(s => sched.songIds.includes(s.id));
    if (linkedSongs.length > 0) {
      text += `\n🎶 *REPERTÓRIO / HINOS:*\n`;
      linkedSongs.forEach(s => {
        const custom = sched.customSongs?.find(c => c.songId === s.id);
        const keyStr = custom?.originalKey || s.originalKey || 'Tom padrão';
        const isCustom = custom && (
          custom.originalKey !== s.originalKey ||
          custom.lyrics !== s.lyrics ||
          custom.bpm ||
          custom.notes
        );

        text += `• ${s.songType === 'hino' ? `Hino nº ${s.number}` : s.title} - ${s.title} (Tom: ${keyStr}${isCustom ? ' - Cópia da Escala' : ''})\n`;
        if (custom?.bpm) text += `  └ Andamento: ${custom.bpm}\n`;
        if (custom?.notes) text += `  └ Obs: ${custom.notes}\n`;
      });
    }

    if (sched.notes) {
      text += `\n📝 *Observações:* ${sched.notes}\n`;
    }

    text += `\n_Confirmem presença! Deus abençoe._ 🙏`;
    return text;
  };

  const handleCopyWhatsApp = (sched: WorshipSchedule) => {
    const text = generateWhatsAppText(sched);
    navigator.clipboard.writeText(text);
    setCopiedScheduleId(sched.id);
    setTimeout(() => setCopiedScheduleId(null), 2500);
  };

  return (
    <div className="w-full">
      {!embedded && (
      <div className="mb-6">
        <PageHeader
          icon={Calendar}
          title="Escalas de Louvor"
          description="Organize os integrantes escalados, horários de ensaio e músicas para cada culto."
          actions={
            <PageHeaderButton icon={Plus} onClick={() => handleOpenNewModal()}>
              Adicionar
            </PageHeaderButton>
          }
        />
      </div>
      )}

      {/* View Tabs & Filter Controls */}
      {!embedded && (
      <div className="flex flex-col gap-4 bg-stone-900/80 border border-stone-800 p-4 rounded-2xl mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center bg-stone-950 border border-stone-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDisplayMode('month')}
              className={`px-4 py-2 rounded-button text-xs font-bold flex items-center gap-2 transition-all ${
                displayMode === 'month'
                  ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Mensal</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('list')}
              className={`px-4 py-2 rounded-button text-xs font-bold flex items-center gap-2 transition-all ${
                displayMode === 'list'
                  ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Programação</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!activeChurchId && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <select
                  value={filterChurchId}
                  onChange={(e) => setFilterChurchId(e.target.value)}
                  className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                >
                  <option value="all">Todas as Igrejas</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="confirmed">Confirmados</option>
                <option value="pending">Pendentes</option>
                <option value="completed">Concluídos</option>
              </select>
            </div>
          </div>
        </div>

        {displayMode === 'list' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setListScope('agenda')}
              className={`px-3 py-1.5 rounded-button text-[11px] font-bold border transition-all ${
                listScope === 'agenda'
                  ? 'bg-stone-800 text-emerald-300 border-emerald-800/60'
                  : 'bg-transparent text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              Próximas ({upcomingSchedules.length})
            </button>
            <button
              type="button"
              onClick={() => setListScope('all')}
              className={`px-3 py-1.5 rounded-button text-[11px] font-bold border transition-all ${
                listScope === 'all'
                  ? 'bg-stone-800 text-emerald-300 border-emerald-800/60'
                  : 'bg-transparent text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              Todas ({filteredSchedules.length})
            </button>
          </div>
        )}
      </div>
      )}

      {!embedded && displayMode === 'month' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={() =>
                setCalendarCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
              className="p-2 rounded-button border border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-stone-100"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-display font-bold text-stone-100 capitalize">
                {monthLabel}
              </h3>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDay(todayStr);
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Ir para hoje
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                setCalendarCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
              className="p-2 rounded-button border border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-stone-100"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell) => {
              const daySchedules = schedulesByDate.get(cell.dateStr) || [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDay;
              return (
                <div
                  key={cell.dateStr}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedDay(cell.dateStr);
                    if (!cell.inMonth) {
                      setCalendarCursor(
                        new Date(
                          Number(cell.dateStr.slice(0, 4)),
                          Number(cell.dateStr.slice(5, 7)) - 1,
                          1
                        )
                      );
                    }
                  }}
                  onDoubleClick={() => {
                    setSelectedDay(cell.dateStr);
                    if (daySchedules.length === 0) {
                      handleOpenNewModal(cell.dateStr);
                    } else if (daySchedules.length === 1) {
                      handleOpenEditModal(daySchedules[0]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDay(cell.dateStr);
                    }
                  }}
                  className={`min-h-[4.5rem] sm:min-h-[6.5rem] rounded-xl border p-1.5 sm:p-2 text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : isToday
                        ? 'border-emerald-700/70 bg-stone-950'
                        : 'border-stone-800 bg-stone-950/40 hover:border-stone-700'
                  } ${cell.inMonth ? '' : 'opacity-40'}`}
                >
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? 'bg-emerald-500 text-stone-950'
                        : 'text-stone-300'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {daySchedules.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(cell.dateStr);
                          handleOpenEditModal(s);
                        }}
                        className={`block w-full truncate rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold border text-left ${
                          s.isFinalized
                            ? 'bg-emerald-900/50 text-emerald-200 border-emerald-700/50'
                            : s.status === 'pending'
                              ? 'bg-amber-950/50 text-amber-200 border-amber-800/40'
                              : 'bg-stone-800 text-stone-200 border-stone-700'
                        }`}
                        title={`${s.time || ''} ${s.serviceType}`.trim()}
                      >
                        <span className="font-mono">{s.time || '—'}</span>
                        <span className="hidden sm:inline"> · {s.serviceType}</span>
                      </button>
                    ))}
                    {daySchedules.length > 3 && (
                      <span className="block text-[9px] text-stone-500 font-mono px-0.5">
                        +{daySchedules.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 pt-3">
            <p className="text-xs text-stone-400">
              {selectedDay
                ? `Dia ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}`
                : 'Selecione um dia'}
              {selectedDay && (
                <span className="text-stone-500 font-mono ml-2">
                  ({schedulesToShow.length} escala{schedulesToShow.length === 1 ? '' : 's'})
                </span>
              )}
            </p>
            {selectedDay && (
              <button
                type="button"
                onClick={() => handleOpenNewModal(selectedDay)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
              >
                + Escala neste dia
              </button>
            )}
          </div>
        </div>
      )}

      {/* Schedule Cards List */}
      {schedulesToShow.length === 0 ? (
        <div className="text-center py-12 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
          <Calendar className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-300">
            {displayMode === 'month'
              ? selectedDay
                ? 'Nenhuma escala neste dia'
                : 'Selecione um dia no calendário'
              : listScope === 'agenda'
                ? 'Nenhuma agenda próxima agendada'
                : 'Nenhuma escala encontrada'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            {displayMode === 'month'
              ? 'Clique duas vezes em um dia vazio ou use o botão abaixo para criar uma escala.'
              : 'Crie uma escala de louvor para que os integrantes do grupo possam confirmar a presença nos próximos cultos.'}
          </p>
          <button
            onClick={() => handleOpenNewModal(displayMode === 'month' ? selectedDay || undefined : undefined)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs shadow-md shadow-emerald-500/20"
          >
            + Criar Escala para Próximo Culto
          </button>
        </div>
      ) : (
        <div className={`grid gap-6 ${embedded ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {schedulesToShow.map((sched) => {
            const church = churches.find(c => c.id === sched.churchId);
            const musicGroup = musicGroups.find(g => g.id === sched.musicGroupId);
            const linkedSongs = songs.filter(s => sched.songIds.includes(s.id));

            const confirmedCount = sched.assignments.filter(a => a.status === 'confirmed').length;
            const declinedCount = sched.assignments.filter(a => a.status === 'declined').length;
            const pendingCount = sched.assignments.filter(a => !a.status || a.status === 'pending').length;

            return (
              <div
                key={sched.id}
                className={`bg-stone-900 border rounded-2xl p-6 shadow-md flex flex-col justify-between transition-all ${
                  sched.isFinalized 
                    ? 'border-emerald-700/60 shadow-emerald-950/20' 
                    : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                <div>
                  {/* Leader Finalization / Status Header */}
                  <div className={`mb-4 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition-all ${
                    sched.isFinalized
                      ? 'bg-emerald-950/40 border-emerald-800/60'
                      : 'bg-stone-950/80 border-stone-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {sched.isFinalized ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                          <Lock className="w-4 h-4 text-emerald-400" />
                          <span>Escala Finalizada pelo Líder</span>
                          {sched.finalizedAt && (
                            <span className="text-[10px] font-normal text-stone-400 font-mono">
                              ({new Date(sched.finalizedAt).toLocaleDateString('pt-BR')})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Unlock className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-semibold text-stone-300">
                            Equipe:
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 font-bold">
                              {confirmedCount} Confirmados
                            </span>
                            {declinedCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800/60 font-bold">
                                {declinedCount} Indisponíveis
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 font-bold">
                                {pendingCount} Pendentes
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFinalizeSchedule(sched)}
                      className={`px-3 py-1.5 rounded-button text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        sched.isFinalized
                          ? 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20'
                      }`}
                    >
                      {sched.isFinalized ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Reabrir Escala</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Finalizar Escala do Dia</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Top Bar */}
                  <div className={`flex items-start gap-2 border-b border-stone-800 pb-3 ${embedded ? 'justify-end' : 'justify-between'}`}>
                    {!embedded && (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            {church ? church.name : 'Igreja não informada'}
                          </span>
                          
                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sched.isFinalized
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                              : sched.status === 'confirmed' 
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              : sched.status === 'pending'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}>
                            {sched.isFinalized ? 'Escala Finalizada' : sched.status === 'confirmed' ? 'Confirmado' : sched.status === 'pending' ? 'Pendente' : 'Concluído'}
                          </span>
                        </div>

                        <h3 className="text-lg font-display font-bold text-stone-100 mt-1">
                          {sched.serviceType}
                        </h3>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyWhatsApp(sched)}
                        className={`p-1.5 rounded-button border text-xs font-medium flex items-center gap-1 transition-all ${
                          copiedScheduleId === sched.id 
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-750 border-stone-700'
                        }`}
                        title="Copiar para WhatsApp"
                      >
                        {copiedScheduleId === sched.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px]">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] hidden sm:inline">WhatsApp</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(sched)}
                        className="p-1.5 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button"
                        title="Editar Escala"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Deseja excluir esta escala?')) {
                            onDeleteSchedule(sched.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-button"
                        title="Excluir Escala"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dates & Time Info */}
                  <div className="grid grid-cols-2 gap-3 my-4 bg-stone-800/40 p-3 rounded-xl border border-stone-800 text-xs">
                    <div className="flex items-center gap-2 text-stone-300">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-stone-500 uppercase font-bold">Data do Culto</p>
                        <p className="font-semibold text-stone-200">
                          {new Date(sched.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {sched.time || '19:00'}
                        </p>
                      </div>
                    </div>

                    {sched.rehearsalDate ? (
                      <div className="flex items-center gap-2 text-stone-300">
                        <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-stone-500 uppercase font-bold">Ensaio</p>
                          <p className="font-semibold text-stone-200">
                            {new Date(sched.rehearsalDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {sched.rehearsalTime || ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-500">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="italic">Ensaio não agendado</span>
                      </div>
                    )}
                  </div>

                  {sched.theme && (
                    <p className="text-xs text-stone-300 mb-3 bg-stone-800/60 px-3 py-1.5 rounded-lg border border-stone-700/50">
                      <strong>Tema:</strong> {sched.theme}
                    </p>
                  )}

                  {/* Member Roles Roster & Interactive Availability */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        Integrantes & Disponibilidade ({sched.assignments.length})
                        {musicGroup && <span className="text-stone-500 font-normal ml-1">({musicGroup.name})</span>}
                      </h4>
                      <span className="text-[10px] text-stone-500 font-mono">
                        Clique para confirmar presença
                      </span>
                    </div>

                    {sched.assignments.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">Nenhum integrante associado a esta escala.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {sched.assignments.map((ass, i) => {
                          const isConfirmed = ass.status === 'confirmed';
                          const isDeclined = ass.status === 'declined';

                          return (
                            <div 
                              key={i} 
                              className={`p-2.5 rounded-xl text-xs border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all ${
                                isConfirmed
                                  ? 'bg-emerald-950/30 border-emerald-800/40'
                                  : isDeclined
                                  ? 'bg-rose-950/30 border-rose-800/40'
                                  : 'bg-stone-800/60 border-stone-750'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40 shrink-0">
                                  {ass.role}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold text-stone-100 block truncate">
                                    {ass.memberName}
                                  </span>
                                  {isDeclined && ass.declineReason && (
                                    <span className="text-[10px] text-rose-300 block font-sans italic">
                                      Indisponível: "{ass.declineReason}"
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Availability Control Buttons */}
                              <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                                {/* Confirm Button */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMemberStatus(sched, i, 'confirmed')}
                                  className={`px-2.5 py-1 rounded-button text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    isConfirmed
                                      ? 'bg-emerald-500 text-stone-950 shadow-sm'
                                      : 'bg-stone-900 hover:bg-emerald-950/80 text-stone-400 hover:text-emerald-300 border border-stone-800'
                                  }`}
                                  title="Indicar que POSSO participar"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Posso</span>
                                </button>

                                {/* Decline Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeclineModal({
                                      isOpen: true,
                                      schedule: sched,
                                      assignmentIndex: i,
                                      memberName: ass.memberName,
                                      reason: ass.declineReason || '',
                                    });
                                  }}
                                  className={`px-2 py-1 rounded-button text-[11px] font-bold flex items-center gap-1 transition-all ${
                                    isDeclined
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-stone-900 hover:bg-rose-950/80 text-stone-400 hover:text-rose-300 border border-stone-800'
                                  }`}
                                  title="Indicar que NÃO posso participar"
                                >
                                  <UserX className="w-3 h-3" />
                                  <span>Não Posso</span>
                                </button>

                                {/* WhatsApp Share to Member */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dateFormatted = new Date(sched.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                      weekday: 'long',
                                      day: '2-digit',
                                      month: '2-digit',
                                    });
                                    const msg = `Olá *${ass.memberName}*! 👋\nVocê foi escalado(a) para tocar/cantar no *${sched.serviceType}*.\n📅 *Data:* ${dateFormatted} às ${sched.time || '19:00'}\n🎸 *Sua Função:* ${ass.role}\n\nPor favor, confirme se poderá participar na escala de louvor! Deus abençoe. 🙏`;
                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-emerald-400 hover:bg-stone-900 rounded-button"
                                  title="Solicitar confirmação via WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Repertório fica na aba do evento — não listar na equipe embutida */}
                  {!embedded && (
                  <div className="mt-4 pt-3 border-t border-stone-800">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-emerald-400" />
                        Repertório do Culto
                        {linkedSongs.length > 0 && (
                          <span className="font-mono text-stone-500">({linkedSongs.length})</span>
                        )}
                      </h4>
                      {sched.setlistId && onOpenSetlist ? (
                        <button
                          type="button"
                          onClick={() => onOpenSetlist(sched.setlistId!)}
                          className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          {linkedSongs.length > 0 ? 'Abrir / editar repertório' : 'Montar repertório'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-500">
                          Salve a escala para gerar o repertório
                        </span>
                      )}
                    </div>

                    {linkedSongs.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">
                        Nenhuma música ainda — adicione no repertório associado.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {linkedSongs.map((song) => {
                          const custom = sched.customSongs?.find((c) => c.songId === song.id);
                          const effectiveKey = custom?.originalKey || song.originalKey;
                          const isCustomized = Boolean(custom?.isCustomized || custom?.eventSongId);

                          const customizedSong: Song = {
                            ...song,
                            originalKey: effectiveKey,
                            lyrics: custom?.lyrics || song.lyrics,
                            timeSignature: custom?.timeSignature || song.timeSignature,
                            notes: custom?.notes || song.notes,
                          };

                          return (
                            <div key={song.id} className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectSong &&
                                  onSelectSong(
                                    customizedSong,
                                    custom?.eventSongId
                                      ? { eventSongId: custom.eventSongId }
                                      : undefined,
                                  )
                                }
                                className={`text-xs px-2.5 py-1 rounded-button flex items-center gap-1.5 transition-all border ${
                                  isCustomized
                                    ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border-emerald-600/80 shadow-sm'
                                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                                }`}
                                title={
                                  isCustomized
                                    ? `Versão do Dia (${effectiveKey}) - Clique para ver cifra`
                                    : 'Clique para ver cifra'
                                }
                              >
                                <span className="font-mono font-bold text-emerald-400">
                                  {song.songType === 'hino' && song.number ? `#${song.number}` : '♪'}
                                </span>
                                <span className="font-medium">{song.title}</span>
                                {effectiveKey && (
                                  <span className="text-[10px] text-emerald-300 font-mono font-bold bg-stone-900/80 px-1.5 py-0.2 rounded border border-stone-750">
                                    Tom: {effectiveKey}
                                  </span>
                                )}
                                {isCustomized && (
                                  <span className="text-[9px] bg-emerald-500 text-stone-950 font-black px-1.5 py-0.2 rounded uppercase">
                                    Cópia do Dia
                                  </span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleSongToEdit({
                                    schedule: sched,
                                    song,
                                    customization: custom || null,
                                  });
                                }}
                                className="p-1 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button border border-stone-800"
                                title="Personalizar Tom, Cifra e Arranjo para esta data"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}

                  {sched.notes && (
                    <p className="text-xs text-stone-400 mt-3 pt-2 border-t border-stone-800/60 italic">
                      💡 {sched.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= SCHEDULE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            
            <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                {editingSchedule ? 'Editar Escala de Louvor' : 'Nova Escala de Louvor'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono p-1 rounded-button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Church & MusicGroup Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Igreja <span className="text-emerald-400">*</span>
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
                      onChange={(e) => {
                        const cId = e.target.value;
                        setFormChurchId(cId);
                        const churchMusicGroups = musicGroups.filter((g) => g.churchId === cId);
                        if (churchMusicGroups.length > 0) {
                          handlePopulateAssignmentsFromMusicGroup(churchMusicGroups[0].id);
                        }
                      }}
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
                    Banda / Grupo
                  </label>
                  <select
                    value={formMusicGroupId}
                    onChange={e => handlePopulateAssignmentsFromMusicGroup(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none"
                  >
                    <option value="">Selecione um grupo...</option>
                    {musicGroups.filter(g => g.churchId === formChurchId).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Service Type */}
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
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Status Escala
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                  >
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendente</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
              </div>

              {!editingSchedule && (
                <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRepeatEnabled}
                      onChange={(e) => setFormRepeatEnabled(e.target.checked)}
                      className="mt-0.5 rounded border-stone-600 bg-stone-800 text-emerald-500 focus:ring-emerald-500/40"
                    />
                    <span className="flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-stone-200">
                        <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                        Criar em lote (repetir)
                      </span>
                      <span className="block text-[11px] text-stone-500 mt-0.5">
                        Replica esta escala várias vezes com o mesmo conteúdo, deslocando a data.
                      </span>
                    </span>
                  </label>

                  {formRepeatEnabled && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                            Quantas vezes
                          </label>
                          <input
                            type="number"
                            min={2}
                            max={52}
                            value={formRepeatCount}
                            onChange={(e) =>
                              setFormRepeatCount(
                                Math.min(52, Math.max(2, Number(e.target.value) || 2))
                              )
                            }
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                            A cada (dias)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={formRepeatIntervalDays}
                            onChange={(e) =>
                              setFormRepeatIntervalDays(
                                Math.min(365, Math.max(1, Number(e.target.value) || 1))
                              )
                            }
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                          />
                        </div>
                      </div>
                      {recurrencePreviewDates.length > 0 && (
                        <p className="text-[11px] text-stone-400 leading-relaxed">
                          <span className="text-stone-300 font-semibold">
                            {recurrencePreviewDates.length} escalas:
                          </span>{' '}
                          {recurrencePreviewDates
                            .map((d) =>
                              new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })
                            )
                            .join(' · ')}
                          {formRehearsalDate && (
                            <span className="block mt-1 text-stone-500">
                              Ensaio também será deslocado no mesmo intervalo.
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tipo de Culto / Serviço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Culto Dominical de Celebração"
                    value={formServiceType}
                    onChange={e => setFormServiceType(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tema / Série de Sermões
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Soberania de Deus"
                    value={formTheme}
                    onChange={e => setFormTheme(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Rehearsal Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-800/40 p-3 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Data do Ensaio
                  </label>
                  <input
                    type="date"
                    value={formRehearsalDate}
                    onChange={e => setFormRehearsalDate(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Horário do Ensaio
                  </label>
                  <input
                    type="time"
                    value={formRehearsalTime}
                    onChange={e => setFormRehearsalTime(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Member Assignments Roster */}
              <div className="pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-stone-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Membros Escala por Função
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAssignmentRow}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded-button text-xs font-semibold border border-stone-700"
                  >
                    + Add Função
                  </button>
                </div>

                {!formMusicGroupId ? (
                  <p className="text-xs text-stone-500 italic py-2">
                    Selecione a banda acima e depois adicione as funções da escala.
                  </p>
                ) : formGroupMembers.length === 0 ? (
                  <p className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                    Esta banda ainda não tem integrantes. Cadastre-os em Igrejas & Bandas.
                  </p>
                ) : formAssignments.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-2">
                    Clique em “+ Add Função” para escalar (ex.: Bateria). Quem tem a habilidade no
                    perfil aparece como sugestão — qualquer integrante pode ser escolhido.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <datalist id="schedule-roles-datalist">
                      {SCHEDULE_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role} />
                      ))}
                    </datalist>
                    {formAssignments.map((ass, i) => {
                      const { suggested, others } = partitionBySkillMatch(
                        formGroupMembers,
                        ass.role,
                        resolveMemberSkills,
                      );
                      const selectedMemberId =
                        ass.memberId ||
                        formGroupMembers.find(
                          (m) =>
                            (ass.userId && m.userId === ass.userId) ||
                            m.name === ass.memberName,
                        )?.id ||
                        '';

                      return (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 bg-stone-800/80 p-2 rounded-xl border border-stone-700"
                        >
                          <input
                            type="text"
                            list="schedule-roles-datalist"
                            placeholder="Função (ex: Bateria)..."
                            value={ass.role}
                            onChange={(e) => handleAssignmentRoleChange(i, e.target.value)}
                            className="sm:w-1/3 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-medium focus:outline-none"
                          />
                          <select
                            value={selectedMemberId}
                            onChange={(e) => handleAssignmentMemberChange(i, e.target.value)}
                            className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-100 focus:outline-none"
                          >
                            <option value="">Selecionar integrante…</option>
                            {suggested.length > 0 && (
                              <optgroup
                                label={
                                  ass.role.trim()
                                    ? `Sugeridos · ${ass.role}`
                                    : 'Sugeridos'
                                }
                              >
                                {suggested.map((m) => (
                                  <option key={`sug-${m.id}`} value={m.id}>
                                    {m.name}
                                    {resolveMemberSkills(m).length
                                      ? ` · ${resolveMemberSkills(m).join(', ')}`
                                      : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup
                              label={
                                suggested.length > 0
                                  ? 'Outros do grupo'
                                  : 'Integrantes do grupo'
                              }
                            >
                              {others.map((m) => (
                                <option key={`oth-${m.id}`} value={m.id}>
                                  {m.name}
                                  {resolveMemberSkills(m).length
                                    ? ` · ${resolveMemberSkills(m).join(', ')}`
                                    : ''}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignmentRow(i)}
                            className="p-1 text-stone-400 hover:text-rose-400 rounded-button self-end sm:self-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/40 px-3 py-2.5 flex items-start gap-2">
                <Music className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  As músicas do culto ficam no <span className="text-stone-200 font-semibold">repertório associado</span> a esta escala (criado ao salvar). Edite-as em Repertórios.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Observações & Instruções para a Equipe
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Chegar 45 minutos antes do culto para passagem de som."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingBatch}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingBatch}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSavingBatch
                    ? 'Salvando...'
                    : !editingSchedule && formRepeatEnabled && formRepeatCount > 1
                      ? `Criar ${formRepeatCount} Escalas`
                      : 'Salvar Escala'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Member Decline Reason Modal */}
      {declineModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h4 className="font-display font-bold text-stone-100 flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-400" />
                Indisponibilidade de {declineModal.memberName}
              </h4>
              <button
                onClick={() => setDeclineModal({ ...declineModal, isOpen: false })}
                className="text-stone-400 hover:text-stone-100 p-1 rounded-button"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Informe o motivo para não poder participar nesta escala de louvor (opcional):
            </p>

            {/* Quick Option Tags */}
            <div className="flex flex-wrap gap-1.5">
              {['Trabalho', 'Viagem', 'Doença/Saúde', 'Compromisso Familiar', 'Estudos'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDeclineModal({ ...declineModal, reason: opt })}
                  className={`px-2.5 py-1 rounded-button text-xs font-medium border transition-colors ${
                    declineModal.reason === opt
                      ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                      : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={declineModal.reason}
              onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
              placeholder="Descreva o motivo..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeclineModal({ ...declineModal, isOpen: false })}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (declineModal.schedule) {
                    handleUpdateMemberStatus(
                      declineModal.schedule,
                      declineModal.assignmentIndex,
                      'declined',
                      declineModal.reason
                    );
                  }
                  setDeclineModal({ ...declineModal, isOpen: false });
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-button text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Salvar Indisponibilidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Song Day Customization Modal */}
      {scheduleSongToEdit && (
        <ScheduleSongEditorModal
          schedule={scheduleSongToEdit.schedule}
          song={scheduleSongToEdit.song}
          customization={scheduleSongToEdit.customization}
          onSave={handleSaveSongCustomization}
          onResetToOriginal={() => handleResetSongCustomization(scheduleSongToEdit.song.id)}
          onClose={() => setScheduleSongToEdit(null)}
        />
      )}

    </div>
  );
};
