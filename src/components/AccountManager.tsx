import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  Edit3,
  ImagePlus,
  Loader2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { AccountStatus, RegisteredUser } from '@/types';
import {
  adminCreateUser,
  adminDeleteUser,
  adminRemoveUserAvatar,
  adminUpdateUser,
  adminUploadUserAvatar,
  approveUserAccount,
  listRegisteredUsers,
  rejectUserAccount,
} from '@/services/accounts';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { KNOWN_SKILLS } from '@/constants/skills';
import { getAvatarPublicUrl } from '@/utils/avatarUrl';
import { AvatarCropDialog } from './AvatarCropDialog';
import { useConfirm } from '@/contexts/ConfirmProvider';

interface AccountManagerProps {
  onAccountsChanged?: () => void;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_CLASS: Record<AccountStatus, string> = {
  pending: 'bg-amber-950/50 text-amber-300 border-amber-800',
  approved: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  rejected: 'bg-rose-950/50 text-rose-300 border-rose-800',
};

type AccountForm = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  skills: string[];
  isAdmin: boolean;
  accountStatus: AccountStatus;
};

const EMPTY_FORM: AccountForm = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  skills: [],
  isAdmin: false,
  accountStatus: 'approved',
};

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export const AccountManager: React.FC<AccountManagerProps> = ({ onAccountsChanged }) => {
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | AccountStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingAccount, setEditingAccount] = useState<RegisteredUser | null>(null);
  const [form, setForm] = useState<AccountForm>({ ...EMPTY_FORM });
  const [customSkill, setCustomSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null);
  const [removeAvatarOnSave, setRemoveAvatarOnSave] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const rows = await listRegisteredUsers();
      setAccounts(rows);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpenId]);

  useEffect(() => {
    if (!modalMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalMode]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts
      .filter((a) => (filterStatus === 'all' ? true : a.account_status === filterStatus))
      .filter((a) => {
        if (!q) return true;
        return (
          a.display_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.phone || '').toLowerCase().includes(q)
        );
      });
  }, [accounts, filterStatus, searchQuery]);

  const pendingCount = useMemo(
    () => accounts.filter((a) => a.account_status === 'pending').length,
    [accounts],
  );

  const resetAvatarState = () => {
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPath(null);
    setAvatarPreviewUrl(null);
    setPendingAvatarBlob(null);
    setRemoveAvatarOnSave(false);
    setCropSrc(null);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm({ ...EMPTY_FORM, accountStatus: 'approved' });
    setCustomSkill('');
    setErrorMsg('');
    resetAvatarState();
    setModalMode('create');
  };

  const openEditModal = (account: RegisteredUser) => {
    setEditingAccount(account);
    setForm({
      name: account.display_name || '',
      email: account.email || '',
      phone: account.phone || '',
      birthDate: account.birth_date ? String(account.birth_date).slice(0, 10) : '',
      skills: [...(account.skills || [])],
      isAdmin: Boolean(account.is_admin),
      accountStatus: account.account_status,
    });
    setCustomSkill('');
    setErrorMsg('');
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setPendingAvatarBlob(null);
    setRemoveAvatarOnSave(false);
    setCropSrc(null);
    setAvatarPath(account.avatar_path || null);
    setAvatarPreviewUrl(getAvatarPublicUrl(account.avatar_path, account.created_at));
    setModalMode('edit');
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setEditingAccount(null);
    setForm({ ...EMPTY_FORM });
    setCustomSkill('');
    resetAvatarState();
  };

  const toggleSkill = (skill: string) => {
    const normalized = normalizeSkill(skill);
    if (!normalized) return;
    setForm((prev) => {
      const exists = prev.skills.some((s) => s.toLowerCase() === normalized.toLowerCase());
      return {
        ...prev,
        skills: exists
          ? prev.skills.filter((s) => s.toLowerCase() !== normalized.toLowerCase())
          : [...prev.skills, normalized],
      };
    });
  };

  const addCustomSkill = () => {
    const normalized = normalizeSkill(customSkill);
    if (!normalized) return;
    toggleSkill(normalized);
    setCustomSkill('');
  };

  const handleApprove = async (userId: string) => {
    setActionId(userId);
    try {
      await approveUserAccount(userId);
      await loadAccounts();
      onAccountsChanged?.();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível aprovar.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionId(userId);
    try {
      await rejectUserAccount(userId);
      await loadAccounts();
      onAccountsChanged?.();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível rejeitar.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (account: RegisteredUser) => {
    setMenuOpenId(null);
    const ok = await confirm({
      title: 'Excluir conta',
      message: `A conta de ${account.display_name} (${account.email}) será excluída e o acesso ao LouvorHub removido.`,
      confirmLabel: 'Excluir conta',
    });
    if (!ok) return;
    setActionId(account.id);
    setErrorMsg('');
    try {
      await adminDeleteUser(account.id);
      await loadAccounts();
      onAccountsChanged?.();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível excluir.');
    } finally {
      setActionId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setErrorMsg('');
    try {
      let userId = editingAccount?.id;
      if (modalMode === 'create') {
        userId = await adminCreateUser({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          birthDate: form.birthDate || undefined,
          skills: form.skills,
          isAdmin: form.isAdmin,
        });
        // Status no cadastro (create já aprova; se pediu outro, atualiza)
        if (form.accountStatus !== 'approved' && userId) {
          await adminUpdateUser({
            userId,
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            isAdmin: form.isAdmin,
            accountStatus: form.accountStatus,
            birthDate: form.birthDate || null,
            skills: form.skills,
          });
        }
      } else if (modalMode === 'edit' && editingAccount) {
        await adminUpdateUser({
          userId: editingAccount.id,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          isAdmin: form.isAdmin,
          accountStatus: form.accountStatus,
          birthDate: form.birthDate || null,
          skills: form.skills,
        });
      }

      if (userId) {
        if (pendingAvatarBlob) {
          await adminUploadUserAvatar(userId, pendingAvatarBlob);
        } else if (removeAvatarOnSave) {
          await adminRemoveUserAvatar(userId, avatarPath);
        }
      }

      setModalMode(null);
      setEditingAccount(null);
      setForm({ ...EMPTY_FORM });
      resetAvatarState();
      await loadAccounts();
      onAccountsChanged?.();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const onPickAvatarFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Selecione um arquivo de imagem válido.');
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setErrorMsg('');
  };

  const onCropConfirm = (blob: Blob) => {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setPendingAvatarBlob(blob);
    setRemoveAvatarOnSave(false);
    setAvatarPreviewUrl(URL.createObjectURL(blob));
  };

  const clearAvatarSelection = () => {
    if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
    setPendingAvatarBlob(null);
    setAvatarPreviewUrl(null);
    if (avatarPath) setRemoveAvatarOnSave(true);
    else setRemoveAvatarOnSave(false);
  };

  const modalAvatarDisplay =
    avatarPreviewUrl && !removeAvatarOnSave
      ? avatarPreviewUrl
      : null;

  const modalInitials = (form.name.trim() || form.email || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={Users}
        title="Contas de usuários"
        description="Cadastro completo de contas do sistema, aprovações e permissões de administrador."
        actions={
          <PageHeaderButton icon={UserPlus} onClick={openCreateModal}>
            Novo cadastro
          </PageHeaderButton>
        }
      />

      {pendingCount > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 text-sm text-amber-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>{pendingCount}</strong> cadastro(s) aguardando aprovação para poder entrar com
            magic link.
          </p>
        </div>
      )}

      {errorMsg && !modalMode && (
        <div className="bg-rose-950/60 border border-rose-800/60 rounded-2xl p-3 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | AccountStatus)}
          className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Rejeitados</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-16 text-stone-500 text-sm">Nenhum usuário encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-4 relative"
            >
              <div
                className="absolute top-3 right-3 z-10"
                ref={menuOpenId === account.id ? menuRef : undefined}
              >
                <button
                  type="button"
                  disabled={actionId === account.id}
                  onClick={() =>
                    setMenuOpenId((id) => (id === account.id ? null : account.id))
                  }
                  className="p-2 bg-stone-800 hover:bg-stone-700 light:bg-stone-100 light:hover:bg-stone-200 text-stone-300 light:text-stone-700 rounded-button border border-stone-700 light:border-stone-300 disabled:opacity-60"
                  title="Ações do usuário"
                  aria-label={`Ações de ${account.display_name}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpenId === account.id}
                >
                  {actionId === account.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreVertical className="w-4 h-4" />
                  )}
                </button>

                {menuOpenId === account.id && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 z-30 min-w-[10.5rem] py-1 rounded-xl border border-stone-700 light:border-stone-200 bg-stone-900 light:bg-white shadow-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpenId(null);
                        openEditModal(account);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 light:text-stone-800 hover:bg-stone-800 light:hover:bg-stone-100 flex items-center gap-2.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleDelete(account)}
                      className="w-full px-3 py-2.5 text-left text-xs font-semibold text-rose-300 light:text-rose-700 hover:bg-rose-950/40 light:hover:bg-rose-50 flex items-center gap-2.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              <div className="min-w-0 pr-10">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-display font-bold text-stone-100 truncate">
                    {account.display_name}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-button border text-[10px] font-bold ${STATUS_CLASS[account.account_status]}`}
                  >
                    {STATUS_LABEL[account.account_status]}
                  </span>
                  {account.is_admin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-button border text-[10px] font-bold bg-violet-950/50 text-violet-300 border-violet-800">
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {account.email}
                </p>
                {account.phone && (
                  <p className="text-xs text-stone-500 flex items-center gap-1.5 truncate mt-0.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {account.phone}
                  </p>
                )}
              </div>

              {(account.account_status === 'pending' ||
                account.account_status === 'approved') && (
                <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-stone-800">
                  {account.account_status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={actionId === account.id}
                        onClick={() => void handleApprove(account.id)}
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
                      >
                        {actionId === account.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={actionId === account.id}
                        onClick={() => void handleReject(account.id)}
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-60 text-rose-300 rounded-button text-xs inline-flex items-center gap-1.5 border border-stone-700"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Rejeitar
                      </button>
                    </>
                  )}

                  {account.account_status === 'approved' && (
                    <span className="text-xs text-emerald-400 light:text-emerald-700 inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Pode entrar
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[min(92vh,760px)] flex flex-col shadow-2xl text-stone-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 sm:px-5 py-3 shrink-0">
              <h3 className="text-lg font-display font-bold text-emerald-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                {modalMode === 'create' ? 'Cadastrar usuário' : 'Editar usuário'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSave(e)}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-3.5 text-sm"
            >
              <p className="text-xs text-stone-500">
                {modalMode === 'create'
                  ? 'Preencha os dados da conta. A pessoa poderá entrar com magic link neste e-mail.'
                  : 'Atualize os dados da conta, habilidades e foto de perfil.'}
              </p>

              {errorMsg && (
                <div className="bg-rose-950/60 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-800 bg-stone-950/50">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                  {modalAvatarDisplay ? (
                    <img
                      src={modalAvatarDisplay}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-emerald-300">{modalInitials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] text-stone-400 inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    Foto de perfil
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-button text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      {modalAvatarDisplay ? 'Trocar foto' : 'Adicionar foto'}
                    </button>
                    {modalAvatarDisplay && (
                      <button
                        type="button"
                        onClick={clearAvatarSelection}
                        className="px-2.5 py-1.5 text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 rounded-button text-[11px] font-semibold"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onPickAvatarFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-1 text-xs">
                  Nome <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1 text-xs">
                  E-mail <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@email.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100"
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1 text-xs">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-1 text-xs">
                  Data de nascimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-stone-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={form.birthDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 pl-9 text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-2 text-xs">
                  Habilidades
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {KNOWN_SKILLS.map((skill) => {
                    const selected = form.skills.some(
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
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
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
                <label className="block text-stone-400 font-semibold mb-1 text-xs">
                  Status da conta
                </label>
                <select
                  value={form.accountStatus}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accountStatus: e.target.value as AccountStatus,
                    }))
                  }
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100"
                >
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(e) => setForm((prev) => ({ ...prev, isAdmin: e.target.checked }))}
                  className="rounded border-stone-600 text-emerald-500 focus:ring-emerald-500/40"
                />
                Administrador do sistema
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
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

      {cropSrc && (
        <AvatarCropDialog
          imageSrc={cropSrc}
          onCancel={() => {
            if (cropSrc.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={onCropConfirm}
        />
      )}
    </div>
  );
};
