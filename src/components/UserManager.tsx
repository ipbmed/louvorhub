import React, { useEffect, useMemo, useState } from 'react';
import { SystemUser, Church, MusicGroup, ResourceGrant, GrantRole } from '../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Building2, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  UserCheck, 
  Music,
  Filter,
  Calendar,
  Plus,
  X,
  User,
  Shield,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { KNOWN_SKILLS } from '@/constants/skills';
import { listAllVisibleOrganizations } from '@/services/organizations';

interface UserManagerProps {
  systemUsers: SystemUser[];
  churches: Church[];
  musicGroups?: MusicGroup[];
  currentUserIsAdmin?: boolean;
  onSaveUser: (user: SystemUser) => void | Promise<void>;
  onDeleteUser: (userId: string) => void;
}

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  skills: [] as string[],
  churchId: '',
  status: 'active' as 'active' | 'inactive',
  isAdmin: false,
  grants: [] as ResourceGrant[],
};

export const UserManager: React.FC<UserManagerProps> = ({
  systemUsers,
  churches,
  musicGroups = [],
  currentUserIsAdmin = false,
  onSaveUser,
  onDeleteUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChurchId, setFilterChurchId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState({ ...EMPTY_FORM });
  const [customSkill, setCustomSkill] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [allChurches, setAllChurches] = useState<Church[]>(churches);

  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen]);

  useEffect(() => {
    let cancelled = false;
    void listAllVisibleOrganizations()
      .then((list) => {
        if (!cancelled) setAllChurches(list.length ? list : churches);
      })
      .catch(() => {
        if (!cancelled) setAllChurches(churches);
      });
    return () => {
      cancelled = true;
    };
  }, [churches]);

  const churchById = useMemo(() => {
    const map = new Map<string, Church>();
    for (const c of allChurches) map.set(c.id, c);
    for (const c of churches) map.set(c.id, c);
    return map;
  }, [allChurches, churches]);

  const filteredUsers = systemUsers.filter(u => {
    if (filterChurchId !== 'all' && u.churchId !== filterChurchId) return false;
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchRole = u.mainRole?.toLowerCase().includes(q);
      const matchSkills = (u.skills || []).some((s) => s.toLowerCase().includes(q));
      const matchEmail = u.email?.toLowerCase().includes(q);
      return matchName || matchRole || matchSkills || matchEmail;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleOpenNewModal = () => {
    setEditingUser(null);
    setUserForm({ ...EMPTY_FORM });
    setCustomSkill('');
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setEditingUser(user);
    const skills = user.skills?.length
      ? [...user.skills]
      : user.mainRole
        ? [user.mainRole]
        : [];
    setUserForm({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      birthDate: user.birthDate || '',
      skills,
      churchId: user.churchId || '',
      status: user.status,
      isAdmin: !!user.isAdmin,
      grants: user.grants ? [...user.grants] : [],
    });
    setCustomSkill('');
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const toggleChurchGrant = (role: 'church_editor' | 'liturgo', orgId: string) => {
    setUserForm((prev) => {
      const exists = prev.grants.some((g) => g.role === role && g.orgId === orgId);
      const grants = exists
        ? prev.grants.filter((g) => !(g.role === role && g.orgId === orgId))
        : [...prev.grants, { role, orgId }];
      return { ...prev, grants };
    });
  };

  const toggleGroupGrant = (groupId: string, orgId?: string) => {
    setUserForm((prev) => {
      const exists = prev.grants.some((g) => g.role === 'group_editor' && g.groupId === groupId);
      const grants = exists
        ? prev.grants.filter((g) => !(g.role === 'group_editor' && g.groupId === groupId))
        : [...prev.grants, { role: 'group_editor' as GrantRole, groupId, orgId }];
      return { ...prev, grants };
    });
  };

  const toggleSkill = (skill: string) => {
    const key = skill.toLowerCase();
    setUserForm((prev) => ({
      ...prev,
      skills: prev.skills.some((s) => s.toLowerCase() === key)
        ? prev.skills.filter((s) => s.toLowerCase() !== key)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    const value = normalizeSkill(customSkill);
    if (!value) return;
    if (userForm.skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setCustomSkill('');
      return;
    }
    setUserForm((prev) => ({ ...prev, skills: [...prev.skills, value] }));
    setCustomSkill('');
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!userForm.name.trim()) next.name = 'Nome é obrigatório.';
    if (userForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) {
      next.email = 'Informe um e-mail válido.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const skills = userForm.skills.map(normalizeSkill).filter(Boolean);
    const userToSave: SystemUser = {
      id: editingUser?.id || '',
      name: userForm.name.trim(),
      email: userForm.email.trim() || undefined,
      phone: userForm.phone.trim() || undefined,
      birthDate: userForm.birthDate.trim() || undefined,
      skills,
      mainRole: skills[0],
      churchId: userForm.churchId || undefined,
      status: userForm.status,
      isAdmin: userForm.isAdmin,
      grants: userForm.isAdmin ? [] : userForm.grants,
      membershipId: editingUser?.membershipId,
      role: editingUser?.role || 'member',
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    try {
      await Promise.resolve(onSaveUser(userToSave));
      setIsModalOpen(false);
    } catch {
      // Erro já tratado no App (toast); mantém o modal aberto
    }
  };

  return (
    <div className="w-full space-y-6">
      
      <PageHeader
        icon={Users}
        title="Usuários e Integrantes"
        description="Gerencie integrantes dos grupos de louvor, vocais, instrumentistas e operadores."
        actions={
          <PageHeaderButton icon={UserPlus} onClick={handleOpenNewModal}>
            Adicionar
          </PageHeaderButton>
        }
      />

      {/* Filter & Search Toolbar */}
      <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, função ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={filterChurchId}
              onChange={(e) => setFilterChurchId(e.target.value)}
              className="bg-transparent text-xs text-stone-300 focus:outline-none"
            >
              <option value="all" className="bg-stone-900 text-stone-200">Todas as Igrejas</option>
              {churches.map(c => (
                <option key={c.id} value={c.id} className="bg-stone-900 text-stone-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-stone-300 focus:outline-none"
            >
              <option value="all" className="bg-stone-900 text-stone-200">Todos os Status</option>
              <option value="active" className="bg-stone-900 text-stone-200">Apenas Ativos</option>
              <option value="inactive" className="bg-stone-900 text-stone-200">Apenas Inativos</option>
            </select>
          </div>

          <span className="text-xs text-stone-500 font-mono hidden md:inline ml-2">
            {filteredUsers.length} usuários
          </span>
        </div>
      </div>

      {/* User Cards Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
          <Users className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-300">Nenhum usuário encontrado</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Tente alterar os termos de busca ou cadastrar um novo integrante para o louvor.
          </p>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
          >
            + Cadastrar Usuário
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const church = user.churchId ? churchById.get(user.churchId) : undefined;
            const isUserActive = user.status === 'active';

            return (
              <div
                key={user.id}
                className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-4 shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Name & Role Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center font-bold text-emerald-300 text-sm shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-100 text-sm flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.isAdmin && (
                            <Shield className="w-4 h-4 text-amber-400 shrink-0" aria-label="Admin" />
                          )}
                          {!user.isAdmin && (user.grants?.length || 0) > 0 && (
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Editor / Liturgo" />
                          )}
                        </h3>
                        {church && (
                          <p className="text-[10px] text-stone-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-stone-500" />
                            <span>{church.name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isUserActive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-stone-950 text-stone-500 border-stone-800'
                    }`}>
                      {isUserActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="mb-3">
                    <span className="text-[10px] uppercase font-mono text-stone-500 block mb-1.5">Habilidades</span>
                    {(user.skills?.length || user.mainRole) ? (
                      <div className="flex flex-wrap gap-1">
                        {(user.skills?.length ? user.skills : [user.mainRole!]).slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/50 rounded-button text-[11px] font-semibold text-emerald-300"
                          >
                            <Music className="w-3 h-3 text-emerald-400" />
                            {skill}
                          </span>
                        ))}
                        {(user.skills?.length || 0) > 4 && (
                          <span className="text-[10px] text-stone-500 self-center">
                            +{(user.skills?.length || 0) - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-stone-500">Nenhuma informada</span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-stone-400 font-mono mb-4">
                    {user.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-stone-500 font-mono">
                    Usuário do Sistema
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(user)}
                      className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-button transition-colors"
                      title="Editar Usuário"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja remover o usuário ${user.name}?`)) {
                          onDeleteUser(user.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-button transition-colors"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Form Modal — mesmos campos do perfil + vínculo com a igreja */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 px-6 py-3 shrink-0">
              <h3 className="font-display font-bold text-stone-100 text-base flex items-center gap-2 tracking-tight">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>{editingUser ? 'Editar usuário' : 'Cadastrar usuário'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-100 p-1 rounded-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="user-manager-form"
              onSubmit={handleSubmit}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4"
              noValidate
            >
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nome <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Nome completo"
                    value={userForm.name}
                    onChange={(e) => {
                      setUserForm({ ...userForm, name: e.target.value });
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-stone-950 border rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      fieldErrors.name ? 'border-rose-600' : 'border-stone-800'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-300 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  E-mail{' '}
                  <span className="text-stone-500 font-normal">
                    {editingUser ? '(login)' : '(recomendado para login)'}
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="usuario@email.com"
                    value={userForm.email}
                    onChange={(e) => {
                      setUserForm({ ...userForm, email: e.target.value });
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-stone-950 border rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      fieldErrors.email ? 'border-rose-600' : 'border-stone-800'
                    }`}
                  />
                </div>
                {fieldErrors.email ? (
                  <p className="text-[11px] text-rose-300 mt-1">{fieldErrors.email}</p>
                ) : (
                  <p className="text-[11px] text-stone-500 mt-1">
                    Sem e-mail o usuário não consegue fazer login.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Data de nascimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={userForm.birthDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setUserForm({ ...userForm, birthDate: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-2">
                  Minhas habilidades
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {KNOWN_SKILLS.map((skill) => {
                    const selected = userForm.skills.some(
                      (s) => s.toLowerCase() === skill.toLowerCase(),
                    );
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1.5 rounded-button text-[11px] font-semibold border transition-colors ${
                          selected
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                            : 'bg-stone-950 text-stone-300 border-stone-700 hover:border-emerald-700/60'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>

                {userForm.skills.filter(
                  (s) => !KNOWN_SKILLS.some((k) => k.toLowerCase() === s.toLowerCase()),
                ).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {userForm.skills
                      .filter(
                        (s) => !KNOWN_SKILLS.some((k) => k.toLowerCase() === s.toLowerCase()),
                      )
                      .map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-[11px] font-semibold bg-teal-950/60 text-teal-200 border border-teal-800/60"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className="text-teal-300/80 hover:text-rose-300"
                            title="Remover"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                    placeholder="Outra habilidade…"
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={!customSkill.trim()}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 border border-stone-700 rounded-button text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Membro da igreja{' '}
                  <span className="text-stone-500 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-stone-500 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    value={userForm.churchId}
                    onChange={(e) => setUserForm({ ...userForm, churchId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Não informado</option>
                    {allChurches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 p-3 bg-stone-950 rounded-xl border border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label
                    className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                      currentUserIsAdmin ? 'text-stone-300' : 'text-stone-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={userForm.isAdmin}
                      disabled={!currentUserIsAdmin}
                      onChange={(e) => setUserForm({ ...userForm, isAdmin: e.target.checked })}
                      className="rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                    />
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin do sistema</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">Status:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setUserForm({
                          ...userForm,
                          status: userForm.status === 'active' ? 'inactive' : 'active',
                        })
                      }
                      className={`px-3 py-1 rounded-button text-xs font-bold transition-all ${
                        userForm.status === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-stone-800 text-stone-400 border border-stone-700'
                      }`}
                    >
                      {userForm.status === 'active' ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>

                {!userForm.isAdmin && (
                  <div className="space-y-3 pt-2 border-t border-stone-800">
                    <p className="text-[11px] text-stone-500 font-semibold uppercase tracking-wide">
                      Permissões por recurso
                    </p>

                    <div>
                      <p className="text-xs font-semibold text-stone-300 mb-1.5">Editor da igreja</p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {allChurches.map((c) => {
                          const selected = userForm.grants.some(
                            (g) => g.role === 'church_editor' && g.orgId === c.id,
                          );
                          return (
                            <button
                              key={`ce-${c.id}`}
                              type="button"
                              onClick={() => toggleChurchGrant('church_editor', c.id)}
                              className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border ${
                                selected
                                  ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                                  : 'bg-stone-900 text-stone-300 border-stone-700'
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-stone-300 mb-1.5">Editor de grupo</p>
                      {musicGroups.length === 0 ? (
                        <p className="text-[11px] text-stone-500">Nenhum grupo cadastrado.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {musicGroups.map((g) => {
                            const selected = userForm.grants.some(
                              (gr) => gr.role === 'group_editor' && gr.groupId === g.id,
                            );
                            const churchName = churchById.get(g.churchId)?.name;
                            return (
                              <button
                                key={`ge-${g.id}`}
                                type="button"
                                onClick={() => toggleGroupGrant(g.id, g.churchId)}
                                className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border ${
                                  selected
                                    ? 'bg-teal-500 text-stone-950 border-teal-400'
                                    : 'bg-stone-900 text-stone-300 border-stone-700'
                                }`}
                              >
                                {g.name}
                                {churchName ? (
                                  <span className="opacity-70"> · {churchName}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-stone-300 mb-1.5">Liturgo</p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {allChurches.map((c) => {
                          const selected = userForm.grants.some(
                            (g) => g.role === 'liturgo' && g.orgId === c.id,
                          );
                          return (
                            <button
                              key={`li-${c.id}`}
                              type="button"
                              onClick={() => toggleChurchGrant('liturgo', c.id)}
                              className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border ${
                                selected
                                  ? 'bg-violet-500 text-stone-950 border-violet-400'
                                  : 'bg-stone-900 text-stone-300 border-stone-700'
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {userForm.isAdmin && (
                  <p className="text-[11px] text-amber-200/80 pt-1 border-t border-stone-800">
                    Admin tem permissão total; grants por recurso não são necessários.
                  </p>
                )}
              </div>

            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-stone-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-manager-form"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-button text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                Salvar usuário
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
