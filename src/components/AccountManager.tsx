import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { AccountStatus, RegisteredUser } from '@/types';
import {
  adminCreateUser,
  adminUpdateUser,
  approveUserAccount,
  listRegisteredUsers,
  rejectUserAccount,
} from '@/services/accounts';
import { PageHeader, PageHeaderButton } from './PageHeader';

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
  isAdmin: boolean;
  accountStatus: AccountStatus;
};

const EMPTY_FORM: AccountForm = {
  name: '',
  email: '',
  phone: '',
  isAdmin: false,
  accountStatus: 'approved',
};

export const AccountManager: React.FC<AccountManagerProps> = ({ onAccountsChanged }) => {
  const [accounts, setAccounts] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | AccountStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingAccount, setEditingAccount] = useState<RegisteredUser | null>(null);
  const [form, setForm] = useState<AccountForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

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

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm({ ...EMPTY_FORM, accountStatus: 'approved' });
    setErrorMsg('');
    setModalMode('create');
  };

  const openEditModal = (account: RegisteredUser) => {
    setEditingAccount(account);
    setForm({
      name: account.display_name || '',
      email: account.email || '',
      phone: account.phone || '',
      isAdmin: Boolean(account.is_admin),
      accountStatus: account.account_status,
    });
    setErrorMsg('');
    setModalMode('edit');
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setEditingAccount(null);
    setForm({ ...EMPTY_FORM });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (modalMode === 'create') {
        await adminCreateUser({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          isAdmin: form.isAdmin,
        });
      } else if (modalMode === 'edit' && editingAccount) {
        await adminUpdateUser({
          userId: editingAccount.id,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          isAdmin: form.isAdmin,
          accountStatus: form.accountStatus,
        });
      }
      setModalMode(null);
      setEditingAccount(null);
      setForm({ ...EMPTY_FORM });
      await loadAccounts();
      onAccountsChanged?.();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={Users}
        title="Contas de usuários"
        description="Cadastro geral, aprovações e criação/edição manual de contas."
        actions={
          <PageHeaderButton icon={UserPlus} onClick={openCreateModal}>
            Cadastrar manualmente
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
              className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="min-w-0 flex-1">
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

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => openEditModal(account)}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-button text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700"
                  title="Editar conta"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>

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
                  <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Pode entrar
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
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
              <h3 className="text-xl font-display font-bold text-emerald-100">
                {modalMode === 'create' ? 'Cadastrar usuário' : 'Editar conta'}
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

            <p className="text-xs text-stone-500 mb-4">
              {modalMode === 'create'
                ? 'Cria a conta já aprovada. Depois associe a pessoa à igreja em Usuários e Integrantes.'
                : 'Altere nome, e-mail, telefone, status e permissão de administrador.'}
            </p>

            {errorMsg && (
              <div className="bg-rose-950/60 border border-rose-800/60 rounded-2xl p-3 mb-4 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={(e) => void handleSave(e)} className="space-y-4 text-sm">
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                />
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Status da conta</label>
                  <select
                    value={form.accountStatus}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        accountStatus: e.target.value as AccountStatus,
                      }))
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100"
                  >
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(e) => setForm((prev) => ({ ...prev, isAdmin: e.target.checked }))}
                  className="rounded border-stone-600 text-emerald-500 focus:ring-emerald-500/40"
                />
                Administrador do sistema
              </label>

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
