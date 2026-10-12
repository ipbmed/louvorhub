import React, { useEffect, useState } from 'react';
import { Check, Church, Plus } from 'lucide-react';
import type { Church as ChurchType } from '@/types';
import { ActionButton, Alert, Field, Input, Modal } from './ui';

type ChurchForm = {
  name: string;
  city: string;
  address: string;
  leader: string;
  phone: string;
  sigla: string;
  color: string;
};

export const DEFAULT_CHURCH_COLOR = '#4f46e5';
const CHURCH_COLORS = ['#4f46e5', '#0d9488', '#db2777', '#ea580c', '#7c3aed', '#0284c7', '#16a34a', '#ca8a04'];

const formFrom = (church?: ChurchType | null): ChurchForm => ({
  name: church?.name || '',
  city: church?.city || '',
  address: church?.address || '',
  leader: church?.leader || '',
  phone: church?.phone || '',
  sigla: church?.sigla || '',
  color: church?.color || DEFAULT_CHURCH_COLOR,
});

interface ChurchFormModalProps {
  open: boolean;
  /** Igreja a editar; ausente para criar uma nova. */
  church?: ChurchType | null;
  onClose: () => void;
  onSave: (church: ChurchType) => void | Promise<void>;
}

/** Formulário de cadastro/edição de igreja (nome, cidade, sigla, contato e cor). */
export const ChurchFormModal: React.FC<ChurchFormModalProps> = ({ open, church, onClose, onSave }) => {
  const [form, setForm] = useState<ChurchForm>(() => formFrom(church));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const isNew = !church;

  useEffect(() => {
    if (!open) return;
    setForm(formFrom(church));
    setErrorMsg('');
  }, [open, church]);

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await onSave({
        ...church,
        id: church?.id ?? `temp-org-${Date.now()}`,
        createdAt: church?.createdAt ?? new Date().toISOString(),
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        leader: form.leader.trim() || undefined,
        phone: form.phone.trim() || undefined,
        sigla: form.sigla.trim(),
        color: form.color,
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível salvar a igreja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      locked={saving}
      icon={Church}
      title={isNew ? 'Nova igreja' : 'Editar igreja'}
      subtitle="Dados exibidos no cabeçalho e nos links públicos."
      footer={
        <>
          <ActionButton variant="light" onClick={close} disabled={saving}>
            Cancelar
          </ActionButton>
          <ActionButton type="submit" form="church-form" variant="primary" icon={isNew ? Plus : Check} loading={saving}>
            {isNew ? 'Criar igreja' : 'Salvar alterações'}
          </ActionButton>
        </>
      }
    >
      <form id="church-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
  );
};
