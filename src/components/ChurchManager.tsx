import React, { useEffect, useMemo, useState } from 'react';
import { 
  Church, 
  MusicGroup, 
  MusicGroupMember,
  SystemUser
} from '../types';
import { 
  Building2, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  MapPin, 
  User, 
  Phone, 
  Music2, 
  ChevronRight,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { getProfileSkills } from '@/constants/skills';

interface ChurchManagerProps {
  churches: Church[];
  musicGroups: MusicGroup[];
  systemUsers?: SystemUser[];
  onSaveChurch: (church: Church) => void;
  onDeleteChurch: (id: string) => void;
  onSaveMusicGroup: (musicGroup: MusicGroup) => void;
  onDeleteMusicGroup: (id: string) => void;
  isAdmin?: boolean;
  /** null = todas (admin) */
  allowedChurchIds?: string[] | null;
  allowedGroupIds?: string[] | null;
  canEditChurch?: (orgId?: string | null) => boolean;
  canEditGroup?: (groupId?: string | null, orgId?: string | null) => boolean;
}

export const ChurchManager: React.FC<ChurchManagerProps> = ({
  churches: churchesProp,
  musicGroups: musicGroupsProp,
  systemUsers = [],
  onSaveChurch,
  onDeleteChurch,
  onSaveMusicGroup,
  onDeleteMusicGroup,
  isAdmin = false,
  allowedChurchIds = null,
  allowedGroupIds = null,
  canEditChurch = (_orgId?: string | null) => isAdmin,
  canEditGroup = (_groupId?: string | null, _orgId?: string | null) => isAdmin,
}) => {
  const churches = useMemo(() => {
    if (isAdmin) return churchesProp;
    const orgIds = new Set<string>();
    for (const id of allowedChurchIds || []) orgIds.add(id);
    for (const g of musicGroupsProp) {
      if (allowedGroupIds?.includes(g.id)) orgIds.add(g.churchId);
    }
    if (!orgIds.size) return [];
    return churchesProp.filter((c) => orgIds.has(c.id));
  }, [churchesProp, musicGroupsProp, isAdmin, allowedChurchIds, allowedGroupIds]);

  const musicGroups = useMemo(() => {
    if (isAdmin) return musicGroupsProp;
    return musicGroupsProp.filter((g) => canEditGroup(g.id, g.churchId));
  }, [musicGroupsProp, isAdmin, canEditGroup]);

  const [selectedChurchId, setSelectedChurchId] = useState<string>(
    churches.length > 0 ? churches[0].id : ''
  );

  useEffect(() => {
    if (!churches.length) {
      setSelectedChurchId('');
      return;
    }
    if (!churches.some((c) => c.id === selectedChurchId)) {
      setSelectedChurchId(churches[0].id);
    }
  }, [churches, selectedChurchId]);

  // Modals state
  const [isChurchModalOpen, setIsChurchModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);

  const [isMusicGroupModalOpen, setIsMusicGroupModalOpen] = useState(false);
  const [editingMusicGroup, setEditingMusicGroup] = useState<MusicGroup | null>(null);

  // Church form
  const [churchForm, setChurchForm] = useState({
    name: '',
    city: '',
    address: '',
    leader: '',
    phone: '',
    color: '#D4AF37',
  });

  // MusicGroup form
  const [musicGroupForm, setMusicGroupForm] = useState<{
    name: string;
    description: string;
    members: MusicGroupMember[];
  }>({
    name: '',
    description: '',
    members: [],
  });

  // Member form inline — vínculo + metadados (ex.: líder); papéis ficam na escala
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newMemberIsLeader, setNewMemberIsLeader] = useState(false);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  const profileSkillsByUserId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const u of systemUsers) {
      map.set(u.id, getProfileSkills(u));
    }
    return map;
  }, [systemUsers]);

  const activeChurch = churches.find(c => c.id === selectedChurchId) || churches[0];
  const activeMusicGroups = musicGroups.filter(g => g.churchId === (activeChurch?.id || ''));
  const canManageActiveChurch = Boolean(activeChurch && canEditChurch(activeChurch.id));

  // Church Modal Handlers
  const openNewChurchModal = () => {
    if (!isAdmin) return;
    setEditingChurch(null);
    setChurchForm({
      name: '',
      city: '',
      address: '',
      leader: '',
      phone: '',
      color: '#D4AF37',
    });
    setIsChurchModalOpen(true);
  };

  const openEditChurchModal = (church: Church) => {
    setEditingChurch(church);
    setChurchForm({
      name: church.name,
      city: church.city,
      address: church.address || '',
      leader: church.leader || '',
      phone: church.phone || '',
      color: church.color || '#D4AF37',
    });
    setIsChurchModalOpen(true);
  };

  const handleSaveChurch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchForm.name.trim() || !churchForm.city.trim()) return;

    const churchToSave: Church = {
      id: editingChurch ? editingChurch.id : `church-${Date.now()}`,
      name: churchForm.name.trim(),
      city: churchForm.city.trim(),
      address: churchForm.address.trim(),
      leader: churchForm.leader.trim(),
      phone: churchForm.phone.trim(),
      color: churchForm.color,
      createdAt: editingChurch ? editingChurch.createdAt : new Date().toISOString(),
    };

    onSaveChurch(churchToSave);
    setSelectedChurchId(churchToSave.id);
    setIsChurchModalOpen(false);
  };

  // MusicGroup Modal Handlers
  const openNewMusicGroupModal = () => {
    if (!canManageActiveChurch) return;
    if (!activeChurch) return;
    setEditingMusicGroup(null);
    setMusicGroupForm({
      name: '',
      description: '',
      members: [],
    });
    setSelectedUserId('');
    setNewMemberIsLeader(false);
    setMemberFormError(null);
    setIsMusicGroupModalOpen(true);
  };

  const openEditMusicGroupModal = (musicGroup: MusicGroup) => {
    setEditingMusicGroup(musicGroup);
    setMusicGroupForm({
      name: musicGroup.name,
      description: musicGroup.description || '',
      members: [...musicGroup.members],
    });
    setSelectedUserId('');
    setNewMemberIsLeader(false);
    setMemberFormError(null);
    setIsMusicGroupModalOpen(true);
  };

  const leadersSummary = (members: MusicGroupMember[]) =>
    members
      .filter((m) => m.isLeader)
      .map((m) => m.name)
      .join(', ');

  const handleAddMemberToForm = () => {
    if (!selectedUserId) {
      setMemberFormError('Selecione um usuário.');
      return;
    }
    const u = systemUsers.find((x) => x.id === selectedUserId);
    if (!u) return;

    if (musicGroupForm.members.some((m) => m.userId === u.id)) {
      setMemberFormError('Este usuário já está no grupo.');
      return;
    }

    const newMember: MusicGroupMember = {
      id: `temp-member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: u.id,
      name: u.name,
      isLeader: newMemberIsLeader,
    };

    setMusicGroupForm((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    setSelectedUserId('');
    setNewMemberIsLeader(false);
    setMemberFormError(null);
  };

  const handleToggleMemberLeader = (id: string) => {
    setMusicGroupForm((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === id ? { ...m, isLeader: !m.isLeader } : m,
      ),
    }));
  };

  const handleRemoveMemberFromForm = (id: string) => {
    setMusicGroupForm((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
  };

  const handleSaveMusicGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicGroupForm.name.trim() || !activeChurch) return;

    const linkedMembers = musicGroupForm.members.filter((m) => Boolean(m.userId));

    const musicGroupToSave: MusicGroup = {
      id: editingMusicGroup?.id || `temp-group-${Date.now()}`,
      churchId: activeChurch.id,
      name: musicGroupForm.name.trim(),
      description: musicGroupForm.description.trim(),
      leaderName: leadersSummary(linkedMembers),
      members: linkedMembers,
      createdAt: editingMusicGroup ? editingMusicGroup.createdAt : new Date().toISOString(),
    };

    onSaveMusicGroup(musicGroupToSave);
    setIsMusicGroupModalOpen(false);
  };

  return (
    <div className="w-full">
      
      <div className="mb-6">
        <PageHeader
          icon={Building2}
          title="Igrejas e Bandas"
          description="Gerencie congregações, grupos de louvor e seus integrantes."
          actions={
            isAdmin ? (
              <PageHeaderButton icon={Plus} onClick={openNewChurchModal}>
                Adicionar
              </PageHeaderButton>
            ) : undefined
          }
        />
      </div>

      {/* Church Selector Tabs */}
      {churches.length === 0 ? (
        <div className="text-center py-12 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
          <Building2 className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-300">
            {isAdmin ? 'Nenhuma igreja cadastrada' : 'Nenhuma igreja no seu escopo'}
          </h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-4">
            {isAdmin
              ? 'Cadastre a primeira igreja para organizar os grupos de louvor.'
              : 'Peça a um administrador para conceder permissão de editor nesta igreja ou grupo.'}
          </p>
          {isAdmin && (
            <button
              onClick={openNewChurchModal}
              className="px-4 py-2 bg-emerald-500 text-stone-950 font-semibold rounded-button text-sm"
            >
              Cadastrar Primeira Igreja
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Column: Churches List Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1">
              Igrejas Cadastradas ({churches.length})
            </h3>

            <div className="space-y-2">
              {churches.map((church) => {
                const isSelected = activeChurch?.id === church.id;
                const churchMusicGroupsCount = musicGroups.filter(g => g.churchId === church.id).length;

                return (
                  <div
                    key={church.id}
                    onClick={() => setSelectedChurchId(church.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-stone-800 border-emerald-500/50 text-stone-100 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: church.color || '#D4AF37' }}
                      />
                      <div className="truncate">
                        <h4 className="text-sm font-bold truncate text-stone-100">
                          {church.name}
                        </h4>
                        <p className="text-xs text-stone-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-500" />
                          {church.city}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300">
                        {churchMusicGroupsCount} {churchMusicGroupsCount === 1 ? 'grupo' : 'grupos'}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-stone-500 transition-transform ${isSelected ? 'translate-x-1 text-emerald-400' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Church Details & MusicGroup Management */}
          {activeChurch && (
            <div className="lg:col-span-3 space-y-6">
              
              {/* Church Card Info */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: activeChurch.color || '#D4AF37' }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                      {activeChurch.city}
                    </span>
                    <h3 className="text-2xl font-display font-bold text-stone-100 mt-2">
                      {activeChurch.name}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-stone-400 mt-3">
                      {activeChurch.address && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-500" />
                          {activeChurch.address}
                        </span>
                      )}
                      {activeChurch.leader && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-500" />
                          Líder: <strong className="text-stone-300">{activeChurch.leader}</strong>
                        </span>
                      )}
                      {activeChurch.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-stone-500" />
                          {activeChurch.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditChurchModal(activeChurch)}
                        className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-emerald-300 rounded-button border border-stone-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Editar dados da Igreja"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja excluir a igreja "${activeChurch.name}" e seus dados?`)) {
                            onDeleteChurch(activeChurch.id);
                          }
                        }}
                        className="p-2 bg-stone-800 hover:bg-rose-950/80 text-stone-400 hover:text-rose-300 rounded-button border border-stone-700 transition-colors"
                        title="Excluir Igreja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* musicGroups / Worship Groups Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
                    <Music2 className="w-5 h-5 text-emerald-400" />
                    Grupos & Bandas de Louvor
                  </h3>
                  <p className="text-xs text-stone-400">
                    Equipes escaladas para reger os momentos de louvor nesta congregação.
                  </p>
                </div>

                {canManageActiveChurch && (
                  <button
                    onClick={openNewMusicGroupModal}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-emerald-300 font-semibold rounded-button text-xs border border-stone-700 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Banda / Grupo
                  </button>
                )}
              </div>

              {/* musicGroups List */}
              {activeMusicGroups.length === 0 ? (
                <div className="text-center py-10 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
                  <Users className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                  <p className="text-sm text-stone-400 font-medium">Nenhum grupo de louvor cadastrado para esta igreja.</p>
                  <p className="text-xs text-stone-500 mt-1 mb-3">Exemplo: Banda do Culto Matutino, Grupo de Louvor Jovens UMP, etc.</p>
                  {canManageActiveChurch && (
                    <button
                      onClick={openNewMusicGroupModal}
                      className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-button text-xs font-semibold"
                    >
                      + Criar Grupo
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeMusicGroups.map((musicGroup) => (
                    <div 
                      key={musicGroup.id}
                      className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div>
                        {/* MusicGroup Title & Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-bold text-stone-100 flex items-center gap-2">
                              {musicGroup.name}
                            </h4>
                            {(() => {
                              const leaderNames =
                                leadersSummary(musicGroup.members) || musicGroup.leaderName || '';
                              const leaderCount = musicGroup.members.filter((m) => m.isLeader).length;
                              if (!leaderNames) return null;
                              return (
                                <p className="text-xs text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  {leaderCount > 1 ? 'Líderes' : 'Líder'}: {leaderNames}
                                </p>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-1">
                            {canEditGroup(musicGroup.id, musicGroup.churchId) && (
                              <>
                                <button
                                  onClick={() => openEditMusicGroupModal(musicGroup)}
                                  className="p-1.5 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button transition-colors"
                                  title="Editar Grupo"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remover o grupo "${musicGroup.name}"?`)) {
                                      onDeleteMusicGroup(musicGroup.id);
                                    }
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-button transition-colors"
                                  title="Excluir Grupo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {musicGroup.description && (
                          <p className="text-xs text-stone-400 mt-2 line-clamp-2">
                            {musicGroup.description}
                          </p>
                        )}

                        {/* MusicGroup Members list */}
                        <div className="mt-4 pt-3 border-t border-stone-800/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              Integrantes ({musicGroup.members.length})
                            </span>
                          </div>

                          {musicGroup.members.length === 0 ? (
                            <p className="text-xs text-stone-500 italic py-1">Nenhum integrante adicionado ainda.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {musicGroup.members.map((member) => (
                                <div 
                                  key={member.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-stone-800/50 border border-stone-800/80 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-stone-200">{member.name}</span>
                                      {member.isLeader && (
                                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-0.5">
                                          <ShieldCheck className="w-2.5 h-2.5" />
                                          Líder
                                        </span>
                                      )}
                                    </div>
                                    {member.userId &&
                                      (profileSkillsByUserId.get(member.userId)?.length ?? 0) > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {profileSkillsByUserId.get(member.userId)!.map((s) => (
                                          <span
                                            key={`card-skill-${member.id}-${s}`}
                                            className="text-[10px] text-stone-400 bg-stone-900/80 border border-stone-700/60 px-1.5 py-0.5 rounded-button"
                                          >
                                            {s}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {(() => {
                                    const phone = systemUsers.find((u) => u.id === member.userId)?.phone;
                                    return phone ? (
                                      <span className="text-[10px] text-stone-500 font-mono">
                                        {phone}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {canEditGroup(musicGroup.id, musicGroup.churchId) && (
                        <div className="pt-2">
                          <button
                            onClick={() => openEditMusicGroupModal(musicGroup)}
                            className="w-full py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-stone-100 rounded-button text-xs font-semibold border border-stone-700/80 transition-colors flex items-center justify-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                            Gerenciar Integrantes
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ================= CHURCH MODAL ================= */}
      {isChurchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                {editingChurch ? 'Editar Igreja' : 'Cadastrar Nova Igreja'}
              </h3>
              <button 
                onClick={() => setIsChurchModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono p-1 rounded-button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChurch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nome da Igreja <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Igreja Presbiteriana de Medianeira"
                  value={churchForm.name}
                  onChange={e => setChurchForm({ ...churchForm, name: e.target.value })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Cidade / UF <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Medianeira - PR"
                    value={churchForm.city}
                    onChange={e => setChurchForm({ ...churchForm, city: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Cor Distintiva
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={churchForm.color}
                      onChange={e => setChurchForm({ ...churchForm, color: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-stone-700 bg-stone-800 cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-stone-400 font-mono">{churchForm.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rua Argentina, 1420 - Centro"
                  value={churchForm.address}
                  onChange={e => setChurchForm({ ...churchForm, address: e.target.value })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Líder
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nome do líder"
                    value={churchForm.leader}
                    onChange={e => setChurchForm({ ...churchForm, leader: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (45) 99822-1100"
                    value={churchForm.phone}
                    onChange={e => setChurchForm({ ...churchForm, phone: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsChurchModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs shadow-md shadow-emerald-500/20"
                >
                  Salvar Igreja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MusicGroup MODAL ================= */}
      {isMusicGroupModalOpen && activeChurch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="p-6 border-b border-stone-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-emerald-400" />
                  {editingMusicGroup ? 'Editar Banda / Grupo' : 'Novo Grupo de Louvor'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Vinculado a: <strong className="text-emerald-300">{activeChurch.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setIsMusicGroupModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono p-1 rounded-button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMusicGroup} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nome do Grupo / Banda <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Banda do Culto Principal"
                  value={musicGroupForm.name}
                  onChange={e => setMusicGroupForm({ ...musicGroupForm, name: e.target.value })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Descrição / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Equipe para os cultos de domingo à noite e eventos especiais."
                  value={musicGroupForm.description}
                  onChange={e => setMusicGroupForm({ ...musicGroupForm, description: e.target.value })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Members Section */}
              <div className="pt-2 border-t border-stone-800">
                <h4 className="text-sm font-bold text-stone-200 flex items-center justify-between mb-3">
                  <span>Integrantes do Grupo</span>
                  <span className="text-xs font-mono text-emerald-400">
                    {musicGroupForm.members.length} cadastrados
                  </span>
                </h4>

                <div className="bg-stone-800/80 border border-stone-700/80 p-3.5 rounded-xl space-y-3 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                      Adicionar integrante
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Funções da escala ficam nas escalas
                    </span>
                  </div>

                  {systemUsers.length === 0 ? (
                    <p className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                      Cadastre usuários em “Usuários e Integrantes” antes de montar o grupo.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] uppercase font-mono text-stone-400 mb-1">
                            Usuário
                          </label>
                          <select
                            value={selectedUserId}
                            onChange={(e) => {
                              setSelectedUserId(e.target.value);
                              setMemberFormError(null);
                            }}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          >
                            <option value="">Selecione um usuário…</option>
                            {systemUsers
                              .filter(
                                (u) =>
                                  u.status === 'active' &&
                                  !musicGroupForm.members.some((m) => m.userId === u.id),
                              )
                              .map((u) => {
                                const skills = getProfileSkills(u);
                                return (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                    {skills.length ? ` · ${skills.slice(0, 3).join(', ')}` : ''}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMemberToForm}
                          disabled={!selectedUserId}
                          className="px-3 py-1.5 bg-emerald-500 disabled:opacity-40 text-stone-950 font-bold rounded-button text-xs hover:bg-emerald-400 h-[34px] shrink-0"
                        >
                          + Adicionar
                        </button>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newMemberIsLeader}
                          onChange={(e) => setNewMemberIsLeader(e.target.checked)}
                          className="rounded border-stone-600 bg-stone-950 text-emerald-500 focus:ring-emerald-500/40"
                        />
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Marcar como líder do grupo
                      </label>
                    </>
                  )}
                  {memberFormError && (
                    <p className="text-[11px] text-rose-300">{memberFormError}</p>
                  )}
                </div>

                {musicGroupForm.members.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-2 text-center">Nenhum integrante adicionado nesta lista ainda.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {[...musicGroupForm.members]
                      .sort((a, b) => Number(Boolean(b.isLeader)) - Number(Boolean(a.isLeader)))
                      .map((mem) => (
                      <div 
                        key={mem.id}
                        className="flex items-center justify-between gap-2 p-2.5 bg-stone-800 rounded-xl border border-stone-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-stone-100">{mem.name}</span>
                            {mem.userId &&
                              (profileSkillsByUserId.get(mem.userId)?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {profileSkillsByUserId.get(mem.userId)!.map((s) => (
                                  <span
                                    key={`form-skill-${mem.id}-${s}`}
                                    className="text-[10px] text-stone-400 bg-stone-900/80 border border-stone-700/60 px-1.5 py-0.5 rounded-button"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleMemberLeader(mem.id)}
                            className={`px-2 py-1 rounded-button text-[10px] font-semibold border inline-flex items-center gap-1 transition-colors ${
                              mem.isLeader
                                ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                                : 'bg-stone-950 text-stone-400 border-stone-700 hover:border-emerald-700/60 hover:text-emerald-300'
                            }`}
                            title={mem.isLeader ? 'Remover liderança' : 'Marcar como líder'}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Líder
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberFromForm(mem.id)}
                            className="p-1 text-stone-400 hover:text-rose-400 hover:bg-stone-700 rounded transition-colors rounded-button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsMusicGroupModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs shadow-md shadow-emerald-500/20"
                >
                  Salvar Grupo de Louvor
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
