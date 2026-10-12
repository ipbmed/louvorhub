import React, { useEffect, useMemo, useState } from 'react';
import {
  SystemUser,
  Church,
  MusicGroup,
  ResourceGrant,
  GrantRole,
  OrgInvitation,
} from '../types';
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
  LayoutGrid,
  List,
  Copy,
  ExternalLink,
  Loader2,
  Check,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { ActionButton } from './ui';
import { KNOWN_SKILLS } from '@/constants/skills';
import { listRegisteredUsers } from '@/services/accounts';
import {
  createOrgInvitation,
  inviteAcceptUrl,
  listOrgInvitations,
  revokeOrgInvitation,
} from '@/services/invitations';
import { useToast } from '@/contexts/ToastProvider';
import { useConfirm } from '@/contexts/ConfirmProvider';
import type { RegisteredUser } from '@/types';
import { getAvatarPublicUrl } from '@/utils/avatarUrl';

function MemberAvatar({ name, avatarPath }: { name: string; avatarPath?: string }) {
  const url = getAvatarPublicUrl(avatarPath);
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-950 light:bg-emerald-100 border border-emerald-700/60 light:border-emerald-300 flex items-center justify-center font-bold text-emerald-300 light:text-emerald-700 text-sm shrink-0">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

interface UserManagerProps {
  orgId: string;
  orgName?: string;
  systemUsers: SystemUser[];
  churches: Church[];
  musicGroups?: MusicGroup[];
  currentUserIsAdmin?: boolean;
  embedded?: boolean;
  onSaveUser: (user: SystemUser) => void | Promise<void>;
  onDeleteUser: (userId: string) => void;
}

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

const MEMBERS_LAYOUT_KEY = 'louvorhub-members-layout';
type MembersLayoutMode = 'cards' | 'list';

type EditForm = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  skills: string[];
  status: 'active' | 'inactive';
  isAdmin: boolean;
  grants: ResourceGrant[];
};

const EMPTY_EDIT_FORM: EditForm = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  skills: [],
  status: 'active',
  isAdmin: false,
  grants: [],
};

export const UserManager: React.FC<UserManagerProps> = ({
  orgId,
  orgName,
  systemUsers,
  churches,
  musicGroups = [],
  currentUserIsAdmin = false,
  embedded = false,
  onSaveUser,
  onDeleteUser,
}) => {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<MembersLayoutMode>(() => {
    try {
      return localStorage.getItem(MEMBERS_LAYOUT_KEY) === 'list' ? 'list' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [associateOpen, setAssociateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ ...EMPTY_EDIT_FORM });
  const [customSkill, setCustomSkill] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<OrgInvitation | null>(null);

  const [associateSearch, setAssociateSearch] = useState('');
  const [associateAccounts, setAssociateAccounts] = useState<RegisteredUser[]>([]);
  const [associateAccountsLoading, setAssociateAccountsLoading] = useState(false);
  const [associateAccountsError, setAssociateAccountsError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<RegisteredUser | null>(null);
  const [associateError, setAssociateError] = useState('');
  const [associateSaving, setAssociateSaving] = useState(false);

  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const churchById = useMemo(() => {
    const map = new Map<string, Church>();
    for (const c of churches) map.set(c.id, c);
    return map;
  }, [churches]);

  const orgGroups = useMemo(
    () => musicGroups.filter((g) => g.churchId === orgId),
    [musicGroups, orgId],
  );

  const orgLabel = orgName || churchById.get(orgId)?.name || 'Igreja';

  const loadInvitations = async () => {
    if (!orgId) return;
    setInvitationsLoading(true);
    try {
      const rows = await listOrgInvitations(orgId);
      setInvitations(rows.filter((i) => i.status === 'pending'));
    } catch (err) {
      showToast((err as Error).message || 'Não foi possível carregar convites.', 'error');
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    void loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    const anyOpen = inviteOpen || associateOpen || editOpen;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inviteOpen, associateOpen, editOpen]);

  const filteredUsers = systemUsers
    .filter((u) => {
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
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleLayoutChange = (mode: MembersLayoutMode) => {
    setLayoutMode(mode);
    try {
      localStorage.setItem(MEMBERS_LAYOUT_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const openInviteModal = () => {
    setInviteName('');
    setInviteEmail('');
    setInviteError('');
    setCreatedInvite(null);
    setInviteSaving(false);
    setInviteOpen(true);
  };

  const memberIds = useMemo(() => new Set(systemUsers.map((u) => u.id)), [systemUsers]);

  const filteredAssociateAccounts = useMemo(() => {
    const q = associateSearch.trim().toLowerCase();
    return associateAccounts
      .filter((a) => a.account_status === 'approved' && !memberIds.has(a.id))
      .filter((a) => {
        if (!q) return true;
        const hay = `${a.display_name} ${a.email} ${a.phone || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name, 'pt-BR'));
  }, [associateAccounts, associateSearch, memberIds]);

  const openAssociateModal = () => {
    setAssociateSearch('');
    setSelectedAccount(null);
    setAssociateError('');
    setAssociateAccountsError('');
    setAssociateSaving(false);
    setAssociateOpen(true);
    setAssociateAccountsLoading(true);
    void (async () => {
      try {
        const rows = await listRegisteredUsers('approved');
        setAssociateAccounts(rows);
      } catch (err) {
        setAssociateAccounts([]);
        setAssociateAccountsError(
          (err as Error).message || 'Não foi possível carregar as contas cadastradas.',
        );
      } finally {
        setAssociateAccountsLoading(false);
      }
    })();
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setEditingUser(user);
    const skills = user.skills?.length
      ? [...user.skills]
      : user.mainRole
        ? [user.mainRole]
        : [];
    setEditForm({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      birthDate: user.birthDate || '',
      skills,
      status: user.status,
      isAdmin: !!user.isAdmin,
      grants: user.grants ? [...user.grants] : [],
    });
    setCustomSkill('');
    setEditErrors({});
    setEditOpen(true);
  };

  const toggleChurchGrant = (role: 'church_editor' | 'liturgo') => {
    setEditForm((prev) => {
      const exists = prev.grants.some((g) => g.role === role && g.orgId === orgId);
      const grants = exists
        ? prev.grants.filter((g) => !(g.role === role && g.orgId === orgId))
        : [...prev.grants, { role, orgId }];
      return { ...prev, grants };
    });
  };

  const toggleGroupGrant = (groupId: string) => {
    setEditForm((prev) => {
      const exists = prev.grants.some((g) => g.role === 'group_editor' && g.groupId === groupId);
      const grants = exists
        ? prev.grants.filter((g) => !(g.role === 'group_editor' && g.groupId === groupId))
        : [...prev.grants, { role: 'group_editor' as GrantRole, groupId, orgId }];
      return { ...prev, grants };
    });
  };

  const toggleSkill = (skill: string) => {
    const key = skill.toLowerCase();
    setEditForm((prev) => ({
      ...prev,
      skills: prev.skills.some((s) => s.toLowerCase() === key)
        ? prev.skills.filter((s) => s.toLowerCase() !== key)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    const value = normalizeSkill(customSkill);
    if (!value) return;
    if (editForm.skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setCustomSkill('');
      return;
    }
    setEditForm((prev) => ({ ...prev, skills: [...prev.skills, value] }));
    setCustomSkill('');
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError('Informe o e-mail.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Informe um e-mail válido.');
      return;
    }
    setInviteSaving(true);
    setInviteError('');
    try {
      const invitation = await createOrgInvitation({
        orgId,
        email,
        displayName: inviteName.trim() || undefined,
      });
      setCreatedInvite(invitation);
      showToast('Convite criado.');
      await loadInvitations();
    } catch (err) {
      setInviteError((err as Error).message || 'Não foi possível criar o convite.');
      showToast((err as Error).message || 'Não foi possível criar o convite.', 'error');
    } finally {
      setInviteSaving(false);
    }
  };

  const copyInviteLink = async (token: string) => {
    const url = inviteAcceptUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado.');
    } catch {
      showToast('Não foi possível copiar o link.', 'error');
    }
  };

  const mailtoInvite = (invitation: OrgInvitation) => {
    const url = inviteAcceptUrl(invitation.token);
    const subject = encodeURIComponent(`Convite para ${orgLabel} — LouvorHub`);
    const body = encodeURIComponent(
      `Olá${invitation.displayName ? ` ${invitation.displayName}` : ''}!\n\n` +
        `Você foi convidado(a) a participar de ${orgLabel} no LouvorHub.\n\n` +
        `Aceite o convite pelo link:\n${url}\n`,
    );
    window.open(`mailto:${invitation.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleRevokeInvitation = async (id: string) => {
    const ok = await confirm({
      title: 'Cancelar convite',
      message: 'O link enviado deixará de funcionar. Você poderá convidar novamente depois.',
      confirmLabel: 'Cancelar convite',
      cancelLabel: 'Manter',
      tone: 'warning',
    });
    if (!ok) return;
    setRevokingId(id);
    try {
      await revokeOrgInvitation(id);
      showToast('Convite cancelado.');
      await loadInvitations();
    } catch (err) {
      showToast((err as Error).message || 'Não foi possível cancelar o convite.', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleAssociateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      setAssociateError('Selecione uma conta cadastrada para associar.');
      return;
    }
    if (selectedAccount.account_status !== 'approved') {
      setAssociateError('Este usuário ainda não foi aprovado pelo administrador.');
      return;
    }
    setAssociateError('');
    setAssociateSaving(true);
    const userToSave: SystemUser = {
      id: selectedAccount.id,
      name: selectedAccount.display_name,
      email: selectedAccount.email,
      phone: selectedAccount.phone || undefined,
      status: 'active',
      churchId: orgId,
      createdAt: new Date().toISOString(),
    };
    try {
      await Promise.resolve(onSaveUser(userToSave));
      setAssociateOpen(false);
      showToast('Membro associado.');
    } catch {
      // Erro já tratado no App (toast)
    } finally {
      setAssociateSaving(false);
    }
  };

  const validateEdit = () => {
    const next: Record<string, string> = {};
    if (!editForm.name.trim()) next.name = 'Nome é obrigatório.';
    setEditErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !validateEdit()) return;

    const skills = editForm.skills.map(normalizeSkill).filter(Boolean);
    const userToSave: SystemUser = {
      id: editingUser.id,
      name: editForm.name.trim(),
      email: editForm.email.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      birthDate: editForm.birthDate.trim() || undefined,
      skills,
      mainRole: skills[0],
      churchId: orgId,
      status: editForm.status,
      isAdmin: editForm.isAdmin,
      grants: editForm.isAdmin ? [] : editForm.grants,
      membershipId: editingUser.membershipId,
      role: editingUser.role || 'member',
      createdAt: editingUser.createdAt,
    };

    try {
      await Promise.resolve(onSaveUser(userToSave));
      setEditOpen(false);
    } catch {
      // Erro já tratado no App (toast)
    }
  };

  const toolbarActions = embedded ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ActionButton variant="primary" icon={Mail} onClick={openInviteModal}>
        Convidar
      </ActionButton>
      <ActionButton variant="secondary" icon={UserPlus} onClick={openAssociateModal}>
        Associar
      </ActionButton>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <PageHeaderButton icon={Mail} onClick={openInviteModal}>
        Convidar
      </PageHeaderButton>
      <PageHeaderButton icon={UserPlus} onClick={openAssociateModal}>
        Associar
      </PageHeaderButton>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {!embedded ? (
        <PageHeader
          icon={Users}
          title="Membros"
          description={`Convide novos integrantes ou associe contas já cadastradas a ${orgLabel}.`}
          actions={toolbarActions}
        />
      ) : (
        <div className="flex justify-end">{toolbarActions}</div>
      )}

      {/* Pending invitations */}
      {(invitationsLoading || invitations.length > 0) && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Convites pendentes
            </h4>
            {invitationsLoading && (
              <Loader2 className="w-3.5 h-3.5 text-stone-500 animate-spin" />
            )}
          </div>
          {!invitationsLoading && invitations.length === 0 ? null : (
            <ul className="space-y-2">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-200 truncate">
                      {inv.displayName || inv.email}
                    </p>
                    <p className="text-[11px] text-stone-500 font-mono truncate">{inv.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ActionButton
                      variant="light"
                      icon={Copy}
                      onClick={() => void copyInviteLink(inv.token)}
                      title="Copiar link"
                      aria-label="Copiar link"
                    />
                    <ActionButton
                      variant="light"
                      icon={ExternalLink}
                      onClick={() => mailtoInvite(inv)}
                      title="Abrir e-mail"
                      aria-label="Abrir e-mail"
                    />
                    <ActionButton
                      variant="danger"
                      icon={X}
                      loading={revokingId === inv.id}
                      onClick={() => void handleRevokeInvitation(inv.id)}
                    >
                      Revogar
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-stone-300 focus:outline-none"
            >
              <option value="all" className="bg-stone-900 text-stone-200">
                Todos os Status
              </option>
              <option value="active" className="bg-stone-900 text-stone-200">
                Apenas Ativos
              </option>
              <option value="inactive" className="bg-stone-900 text-stone-200">
                Apenas Inativos
              </option>
            </select>
          </div>

          <div
            className="flex items-center shrink-0 bg-stone-950 border border-stone-800 rounded-xl p-0.5"
            role="group"
            aria-label="Modo de visualização"
          >
            <button
              type="button"
              onClick={() => handleLayoutChange('cards')}
              aria-label="Visualização em cards"
              title="Cards"
              className={`flex items-center justify-center gap-1.5 min-h-8 min-w-8 sm:min-w-0 px-2 py-1.5 rounded-button text-xs font-semibold transition-all ${
                layoutMode === 'cards'
                  ? 'bg-emerald-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('list')}
              aria-label="Listagem simples"
              title="Lista"
              className={`flex items-center justify-center gap-1.5 min-h-8 min-w-8 sm:min-w-0 px-2 py-1.5 rounded-button text-xs font-semibold transition-all ${
                layoutMode === 'list'
                  ? 'bg-emerald-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>

          <span className="text-xs text-stone-500 font-mono hidden md:inline ml-2">
            {filteredUsers.length} membros
          </span>
        </div>
      </div>

      {/* Member list / cards */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
          <Users className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-300">Nenhum membro encontrado</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Convide alguém por e-mail ou associe uma conta já cadastrada a esta igreja.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ActionButton variant="primary" icon={Mail} onClick={openInviteModal}>
              Convidar
            </ActionButton>
            <ActionButton variant="secondary" icon={UserPlus} onClick={openAssociateModal}>
              Associar
            </ActionButton>
          </div>
        </div>
      ) : layoutMode === 'list' ? (
        <div className="flex flex-col gap-2">
          {filteredUsers.map((user) => {
            const isUserActive = user.status === 'active';
            const skills = user.skills?.length
              ? user.skills
              : user.mainRole
                ? [user.mainRole]
                : [];

            return (
              <div
                key={user.id}
                className="flex items-center gap-3 px-3 py-2.5 sm:px-4 bg-stone-900/70 hover:bg-stone-800/90 border border-stone-800 hover:border-emerald-700/40 rounded-xl transition-colors"
              >
                <MemberAvatar name={user.name} avatarPath={user.avatarUrl} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-bold text-stone-100 text-sm truncate">{user.name}</h3>
                    {user.isAdmin && (
                      <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-label="Admin" />
                    )}
                    {!user.isAdmin && (user.grants?.length || 0) > 0 && (
                      <ShieldCheck
                        className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                        aria-label="Editor / Liturgo"
                      />
                    )}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isUserActive
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200'
                          : 'bg-stone-950 text-stone-500 border-stone-800 light:bg-stone-100 light:text-stone-600 light:border-stone-300'
                      }`}
                    >
                      {isUserActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0 text-[11px] text-stone-400">
                    {skills.length > 0 && (
                      <span className="truncate">{skills.slice(0, 3).join(' · ')}</span>
                    )}
                    {user.email && (
                      <span className="hidden sm:inline truncate font-mono text-stone-500">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <ActionButton
                    variant="light"
                    icon={Edit3}
                    onClick={() => handleOpenEditModal(user)}
                    title="Editar membro"
                    aria-label="Editar membro"
                  />
                  <ActionButton
                    variant="danger"
                    icon={Trash2}
                    title="Remover membro"
                    aria-label="Remover membro"
                    onClick={() => {
                      void confirm({
                        title: 'Remover membro',
                        message: `${user.name} deixará de fazer parte desta igreja. A conta continua existindo.`,
                        confirmLabel: 'Remover',
                      }).then((ok) => {
                        if (ok) onDeleteUser(user.id);
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
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
                  <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar name={user.name} avatarPath={user.avatarUrl} />
                      <div>
                        <h3 className="font-bold text-stone-100 text-sm flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.isAdmin && (
                            <Shield className="w-4 h-4 text-amber-400 shrink-0" aria-label="Admin" />
                          )}
                          {!user.isAdmin && (user.grants?.length || 0) > 0 && (
                            <ShieldCheck
                              className="w-4 h-4 text-emerald-400 shrink-0"
                              aria-label="Editor / Liturgo"
                            />
                          )}
                        </h3>
                        {(church || orgLabel) && (
                          <p className="text-[10px] text-stone-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-stone-500" />
                            <span>{church?.name || orgLabel}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isUserActive
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200'
                          : 'bg-stone-950 text-stone-500 border-stone-800 light:bg-stone-100 light:text-stone-600 light:border-stone-300'
                      }`}
                    >
                      {isUserActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className="text-[10px] uppercase font-mono text-stone-500 block mb-1.5">
                      Habilidades
                    </span>
                    {user.skills?.length || user.mainRole ? (
                      <div className="flex flex-wrap gap-1">
                        {(user.skills?.length ? user.skills : [user.mainRole!])
                          .slice(0, 4)
                          .map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/50 light:bg-emerald-50 light:border-emerald-200 rounded-button text-[11px] font-semibold text-emerald-300 light:text-emerald-700"
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

                <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-stone-500 font-mono">Membro</span>

                  <div className="flex items-center gap-1.5">
                    <ActionButton
                      variant="light"
                      icon={Edit3}
                      onClick={() => handleOpenEditModal(user)}
                      title="Editar membro"
                      aria-label="Editar membro"
                    />
                    <ActionButton
                      variant="danger"
                      icon={Trash2}
                      title="Remover membro"
                      aria-label="Remover membro"
                      onClick={() => {
                        void confirm({
                          title: 'Remover membro',
                          message: `${user.name} deixará de fazer parte desta igreja. A conta continua existindo.`,
                          confirmLabel: 'Remover',
                        }).then((ok) => {
                          if (ok) onDeleteUser(user.id);
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md max-h-[min(92vh,640px)] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 px-6 py-3 shrink-0">
              <h3 className="font-display font-bold text-stone-100 text-base flex items-center gap-2 tracking-tight">
                <Mail className="w-5 h-5 text-emerald-400" />
                <span>Convidar membro</span>
              </h3>
              <ActionButton variant="light" icon={X} onClick={() => setInviteOpen(false)} aria-label="Fechar" title="Fechar" />
            </div>

            {createdInvite ? (
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
                <p className="text-xs text-stone-300">
                  Convite criado para{' '}
                  <span className="font-semibold text-emerald-300">{createdInvite.email}</span>.
                  Compartilhe o link abaixo.
                </p>
                <div className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] font-mono text-stone-400 break-all">
                    {inviteAcceptUrl(createdInvite.token)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <ActionButton variant="light" icon={Copy} onClick={() => void copyInviteLink(createdInvite.token)}>
                    Copiar link
                  </ActionButton>
                  <ActionButton variant="light" icon={ExternalLink} onClick={() => mailtoInvite(createdInvite)}>
                    Abrir e-mail
                  </ActionButton>
                  <ActionButton variant="primary" icon={Check} onClick={() => setInviteOpen(false)}>
                    Fechar
                  </ActionButton>
                </div>
              </div>
            ) : (
              <>
                <form
                  id="invite-form"
                  onSubmit={(e) => void handleInviteSubmit(e)}
                  className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4"
                  noValidate
                >
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Nome{' '}
                      <span className="text-stone-500 font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Nome do convidado"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      E-mail <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="convidado@email.com"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          if (inviteError) setInviteError('');
                        }}
                        className={`w-full bg-stone-950 border rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                          inviteError ? 'border-rose-600' : 'border-stone-800'
                        }`}
                      />
                    </div>
                    {inviteError && (
                      <p className="text-[11px] text-rose-300 mt-1">{inviteError}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Gera um link de convite para a pessoa entrar em {orgLabel}.
                  </p>
                </form>
                <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-stone-800 shrink-0">
                  <ActionButton variant="light" onClick={() => setInviteOpen(false)}>
                    Cancelar
                  </ActionButton>
                  <ActionButton type="submit" form="invite-form" variant="primary" icon={Mail} loading={inviteSaving}>
                    Enviar convite
                  </ActionButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Associate modal */}
      {associateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md max-h-[min(92vh,640px)] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 px-6 py-3 shrink-0">
              <h3 className="font-display font-bold text-stone-100 text-base flex items-center gap-2 tracking-tight">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>Associar membro</span>
              </h3>
              <ActionButton variant="light" icon={X} onClick={() => setAssociateOpen(false)} aria-label="Fechar" title="Fechar" />
            </div>

            <form
              id="associate-form"
              onSubmit={(e) => void handleAssociateSubmit(e)}
              className="flex-1 min-h-0 overflow-hidden flex flex-col"
              noValidate
            >
              <div className="px-6 py-4 space-y-3 shrink-0">
                <p className="text-[11px] text-stone-500">
                  Busque nas contas aprovadas e selecione quem deseja associar a esta igreja.
                </p>

                <div className="relative">
                  <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    autoFocus
                    placeholder="Buscar por nome, e-mail ou telefone..."
                    value={associateSearch}
                    onChange={(e) => {
                      setAssociateSearch(e.target.value);
                      setAssociateError('');
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {associateError && (
                  <p className="text-[11px] text-rose-300">{associateError}</p>
                )}
                {associateAccountsError && (
                  <p className="text-[11px] text-rose-300">{associateAccountsError}</p>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
                {associateAccountsLoading ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  </div>
                ) : filteredAssociateAccounts.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500">
                    {associateSearch.trim()
                      ? 'Nenhuma conta encontrada com essa busca.'
                      : 'Não há contas aprovadas disponíveis para associar.'}
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {filteredAssociateAccounts.map((account) => {
                      const selected = selectedAccount?.id === account.id;
                      return (
                        <li key={account.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAccount(account);
                              setAssociateError('');
                            }}
                            className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                              selected
                                ? 'bg-emerald-950/50 border-emerald-600/60 light:bg-emerald-50 light:border-emerald-300'
                                : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 light:bg-white light:border-stone-200 light:hover:border-stone-300'
                            }`}
                          >
                            <p className="text-sm font-semibold text-stone-100 truncate">
                              {account.display_name}
                            </p>
                            <p className="text-[11px] text-stone-400 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 shrink-0" />
                              {account.email}
                            </p>
                            {account.phone && (
                              <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 shrink-0" />
                                {account.phone}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-stone-800 shrink-0">
              <ActionButton variant="light" onClick={() => setAssociateOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton
                type="submit"
                form="associate-form"
                variant="primary"
                icon={UserPlus}
                loading={associateSaving}
                disabled={!selectedAccount}
              >
                Associar
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit member modal */}
      {editOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 px-6 py-3 shrink-0">
              <h3 className="font-display font-bold text-stone-100 text-base flex items-center gap-2 tracking-tight">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Editar membro</span>
              </h3>
              <ActionButton variant="light" icon={X} onClick={() => setEditOpen(false)} aria-label="Fechar" title="Fechar" />
            </div>

            <form
              id="edit-member-form"
              onSubmit={(e) => void handleEditSubmit(e)}
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
                    value={editForm.name}
                    onChange={(e) => {
                      setEditForm({ ...editForm, name: e.target.value });
                      if (editErrors.name) {
                        setEditErrors((prev) => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-stone-950 border rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      editErrors.name ? 'border-rose-600' : 'border-stone-800'
                    }`}
                  />
                </div>
                {editErrors.name && (
                  <p className="text-[11px] text-rose-300 mt-1">{editErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  E-mail <span className="text-stone-500 font-normal">(login)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-xs text-stone-100 opacity-70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
                    value={editForm.birthDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-2">
                  Habilidades
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {KNOWN_SKILLS.map((skill) => {
                    const selected = editForm.skills.some(
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

                {editForm.skills.filter(
                  (s) => !KNOWN_SKILLS.some((k) => k.toLowerCase() === s.toLowerCase()),
                ).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {editForm.skills
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
                  <ActionButton variant="secondary" icon={Plus} onClick={addCustomSkill} disabled={!customSkill.trim()}>
                    Adicionar
                  </ActionButton>
                </div>
              </div>

              <div className="text-xs text-stone-400 flex items-center gap-1.5 px-1">
                <Building2 className="w-3.5 h-3.5 text-stone-500" />
                Igreja: <span className="font-semibold text-stone-200">{orgLabel}</span>
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
                      checked={editForm.isAdmin}
                      disabled={!currentUserIsAdmin}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isAdmin: e.target.checked })
                      }
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
                        setEditForm({
                          ...editForm,
                          status: editForm.status === 'active' ? 'inactive' : 'active',
                        })
                      }
                      className={`px-3 py-1 rounded-button text-xs font-bold transition-all ${
                        editForm.status === 'active'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200'
                          : 'bg-stone-800 text-stone-400 border border-stone-700 light:bg-stone-100 light:text-stone-600 light:border-stone-300'
                      }`}
                    >
                      {editForm.status === 'active' ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>

                {!editForm.isAdmin && (
                  <div className="space-y-3 pt-2 border-t border-stone-800">
                    <p className="text-[11px] text-stone-500 font-semibold uppercase tracking-wide">
                      Permissões por recurso
                    </p>

                    <div>
                      <p className="text-xs font-semibold text-stone-300 mb-1.5">
                        Editor da igreja
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleChurchGrant('church_editor')}
                        className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border ${
                          editForm.grants.some(
                            (g) => g.role === 'church_editor' && g.orgId === orgId,
                          )
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                            : 'bg-stone-900 text-stone-300 border-stone-700'
                        }`}
                      >
                        {orgLabel}
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-stone-300 mb-1.5">
                        Editor de grupo
                      </p>
                      {orgGroups.length === 0 ? (
                        <p className="text-[11px] text-stone-500">Nenhum grupo cadastrado.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {orgGroups.map((g) => {
                            const selected = editForm.grants.some(
                              (gr) => gr.role === 'group_editor' && gr.groupId === g.id,
                            );
                            return (
                              <button
                                key={`ge-${g.id}`}
                                type="button"
                                onClick={() => toggleGroupGrant(g.id)}
                                className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border ${
                                  selected
                                    ? 'bg-teal-500 text-stone-950 border-teal-400'
                                    : 'bg-stone-900 text-stone-300 border-stone-700'
                                }`}
                              >
                                {g.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-stone-300 mb-1.5">Liturgo</p>
                      <button
                        type="button"
                        onClick={() => toggleChurchGrant('liturgo')}
                        className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border ${
                          editForm.grants.some((g) => g.role === 'liturgo' && g.orgId === orgId)
                            ? 'bg-violet-500 text-stone-950 border-violet-400'
                            : 'bg-stone-900 text-stone-300 border-stone-700'
                        }`}
                      >
                        {orgLabel}
                      </button>
                    </div>
                  </div>
                )}

                {editForm.isAdmin && (
                  <p className="text-[11px] text-amber-200/80 pt-1 border-t border-stone-800">
                    Admin tem permissão total; grants por recurso não são necessários.
                  </p>
                )}
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-stone-800 shrink-0">
              <ActionButton variant="light" onClick={() => setEditOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit" form="edit-member-form" variant="primary" icon={Check}>
                Salvar
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
