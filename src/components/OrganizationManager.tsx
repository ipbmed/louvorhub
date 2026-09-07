import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Edit3,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { Church } from '@/types';
import { PageHeader, PageHeaderButton } from './PageHeader';

interface OrganizationManagerProps {
  churches: Church[];
  loading?: boolean;
  onSave: (church: Church) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
}

const EMPTY_FORM = {
  name: '',
  city: '',
  address: '',
  leader: '',
  phone: '',
  sigla: '',
  color: '#10b981',
};

export const OrganizationManager: React.FC<OrganizationManagerProps> = ({
  churches,
  loading = false,
  onSave,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Church | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [...churches].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.sigla || '').toLowerCase().includes(q) ||
        (c.leader || '').toLowerCase().includes(q),
    );
  }, [churches, searchQuery]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEdit = (church: Church) => {
    setEditing(church);
    setForm({
      name: church.name,
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
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      setErrorMsg('Nome e cidade são obrigatórios.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await onSave({
        id: editing?.id || `temp-org-${Date.now()}`,
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        leader: form.leader.trim() || undefined,
        phone: form.phone.trim() || undefined,
        sigla: form.sigla.trim() || undefined,
        color: form.color,
        createdAt: editing?.createdAt || new Date().toISOString(),
      });
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível salvar a igreja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={Building2}
        title="Igrejas"
        description="Cadastro e edição das igrejas do LouvorHub."
        actions={
          <PageHeaderButton icon={Plus} onClick={openCreate}>
            Nova igreja
          </PageHeaderButton>
        }
      />

      <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade ou sigla..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-500 text-sm border border-dashed border-stone-800 rounded-3xl">
          Nenhuma igreja encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((church) => (
            <div
              key={church.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div
                className="w-2.5 h-10 rounded-full shrink-0 hidden sm:block"
                style={{ backgroundColor: church.color || '#10b981' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-display font-bold text-stone-100 truncate">{church.name}</h3>
                  {church.sigla && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-button border border-stone-700 text-stone-400">
                      {church.sigla}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {church.city}
                  </span>
                  {church.leader && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {church.leader}
                    </span>
                  )}
                  {church.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {church.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(church)}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-button text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(church.id)}
                  className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-button border border-rose-800/40"
                  title="Excluir igreja"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
              <h3 className="text-xl font-display font-bold text-emerald-100">
                {editing ? 'Editar igreja' : 'Nova igreja'}
              </h3>
              <button type="button" onClick={closeModal} className="p-1.5 text-stone-400 hover:text-stone-100">
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
                  <label className="block text-stone-400 font-semibold mb-1">Responsável</label>
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
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Cor</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-10 w-full bg-stone-950 border border-stone-800 rounded-xl p-1 cursor-pointer"
                />
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
