import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Save,
  User,
  Loader2,
  Trash2,
  Camera,
  ImagePlus,
  Plus,
  X,
  Mail,
  Phone,
  Calendar,
  Pencil,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastProvider';
import { supabase } from '@/lib/supabase';
import { updateProfileDetails } from '@/services/members';
import { listAllVisibleOrganizations } from '@/services/organizations';
import type { Church } from '@/types';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { AvatarCropDialog } from './AvatarCropDialog';
import { CameraCaptureDialog } from './CameraCaptureDialog';
import { KNOWN_SKILLS } from '@/constants/skills';

interface ProfilePageProps {
  onBack?: () => void;
}

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function skillsFromProfile(profile: {
  skills?: string[] | null;
  main_role?: string | null;
} | null): string[] {
  if (profile?.skills?.length) return [...profile.skills];
  if (profile?.main_role) {
    return profile.main_role
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '');
  const [churchId, setChurchId] = useState(profile?.church_id || '');
  const [skills, setSkills] = useState<string[]>(skillsFromProfile(profile));
  const [customSkill, setCustomSkill] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [churches, setChurches] = useState<Church[]>([]);

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const syncFromProfile = () => {
    setDisplayName(profile?.display_name || '');
    setPhone(profile?.phone || '');
    setBirthDate(profile?.birth_date || '');
    setChurchId(profile?.church_id || '');
    setSkills(skillsFromProfile(profile));
    setCustomSkill('');
    setFieldErrors({});
    setError(null);
  };

  useEffect(() => {
    if (!editing) syncFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when profile changes outside edit
  }, [profile, editing]);

  useEffect(() => {
    let cancelled = false;
    void listAllVisibleOrganizations()
      .then((list) => {
        if (!cancelled) setChurches(list);
      })
      .catch(() => {
        if (!cancelled) setChurches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedChurchName = useMemo(
    () => churches.find((c) => c.id === churchId)?.name,
    [churches, churchId],
  );

  const avatarUrl = profile?.avatar_path
    ? `${supabase.storage.from('avatars').getPublicUrl(profile.avatar_path).data.publicUrl}?t=${profile.updated_at || ''}`
    : null;

  const email = user?.email || '';
  const canLoginWithEmail = Boolean(email);

  const availableKnownSkills = useMemo(
    () => KNOWN_SKILLS.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())),
    [skills],
  );

  const startEditing = () => {
    syncFromProfile();
    setEditing(true);
  };

  const cancelEditing = () => {
    syncFromProfile();
    setEditing(false);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!displayName.trim()) {
      next.displayName = 'Nome é obrigatório.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const toggleSkill = (skill: string) => {
    if (!editing) return;
    const key = skill.toLowerCase();
    setSkills((prev) =>
      prev.some((s) => s.toLowerCase() === key)
        ? prev.filter((s) => s.toLowerCase() !== key)
        : [...prev, skill],
    );
  };

  const addCustomSkill = () => {
    if (!editing) return;
    const value = normalizeSkill(customSkill);
    if (!value) return;
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setCustomSkill('');
      return;
    }
    setSkills((prev) => [...prev, value]);
    setCustomSkill('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editing) return;
    if (!validate()) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const cleanedSkills = skills.map(normalizeSkill).filter(Boolean);
      await updateProfileDetails(user.id, {
        display_name: displayName.trim(),
        phone: phone.trim() || null,
        birth_date: birthDate.trim() || null,
        skills: cleanedSkills,
        main_role: cleanedSkills[0] || null,
        church_id: churchId.trim() || null,
      });
      await refreshProfile();
      setEditing(false);
      showToast('Perfil salvo.');
    } catch (err) {
      const msg = (err as Error).message || 'Falha ao salvar perfil.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openCropFromFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido.');
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setError(null);
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    setError(null);
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (uploadErr) {
      setUploading(false);
      setError(uploadErr.message);
      showToast(uploadErr.message, 'error');
      return;
    }
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_path: path })
      .eq('id', user.id);
    setUploading(false);
    if (updateErr) {
      setError(updateErr.message);
      showToast(updateErr.message, 'error');
      return;
    }
    await refreshProfile();
    showToast('Foto atualizada.');
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_path) return;
    setUploading(true);
    setError(null);
    await supabase.storage.from('avatars').remove([profile.avatar_path]);
    const { error: err } = await supabase
      .from('profiles')
      .update({ avatar_path: null })
      .eq('id', user.id);
    setUploading(false);
    if (err) {
      setError(err.message);
      showToast(err.message, 'error');
      return;
    }
    await refreshProfile();
    showToast('Foto removida.');
  };

  const initials = (displayName || email || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const inputClass = (hasError?: boolean) =>
    `w-full border rounded-xl p-3 pl-10 focus:outline-none ${
      editing
        ? `bg-stone-950 text-stone-100 focus:ring-2 focus:ring-emerald-500/40 ${
            hasError ? 'border-rose-600' : 'border-stone-800'
          }`
        : 'bg-stone-950/50 text-stone-300 border-stone-800/80 cursor-default'
    }`;

  const customSkills = skills.filter(
    (s) => !KNOWN_SKILLS.some((k) => k.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        icon={User}
        title="Meu perfil"
        description={editing ? 'Edite seus dados e salve as alterações.' : 'Visualize seus dados pessoais.'}
        actions={
          editing ? (
            <PageHeaderButton icon={X} variant="secondary" onClick={cancelEditing} disabled={busy}>
              Cancelar
            </PageHeaderButton>
          ) : (
            <PageHeaderButton icon={Pencil} onClick={startEditing}>
              Editar
            </PageHeaderButton>
          )
        }
      />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] gap-4 lg:gap-6 lg:items-start">
        {/* Foto: ao lado e sticky quando há espaço */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 sm:p-5 flex flex-row lg:flex-col items-center lg:items-stretch gap-4">
            <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-full lg:aspect-square lg:h-auto rounded-2xl overflow-hidden bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover aspect-square" />
              ) : (
                <span className="text-2xl lg:text-4xl font-bold text-emerald-300">{initials}</span>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-0 flex-1 lg:flex-initial">
              {!editing && (
                <p className="text-xs text-stone-400 lg:text-center">
                  <span className="block font-semibold text-stone-200 text-sm truncate">
                    {displayName.trim() || 'Sem nome'}
                  </span>
                  {phone.trim() ? <span className="block mt-0.5 truncate">{phone.trim()}</span> : null}
                </p>
              )}

              {editing && (
                <>
                  <p className="text-[11px] text-stone-400 lg:text-center">
                    Foto 200×200px
                  </p>
                  <div className="flex flex-wrap lg:flex-col gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-button text-xs font-semibold disabled:opacity-50"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      {uploading ? 'Enviando…' : 'Galeria'}
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setCameraOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-button text-xs font-semibold disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Tirar foto
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => void removeAvatar()}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-200 rounded-button"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover
                      </button>
                    )}
                  </div>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openCropFromFile(file);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </aside>

        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5 min-w-0">
        {error && editing && (
          <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSave(e)} className="space-y-4 text-sm" noValidate>
          <div>
            <label className="block text-stone-400 font-semibold mb-1 text-xs">
              Nome {editing && <span className="text-rose-400">*</span>}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (fieldErrors.displayName) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.displayName;
                      return next;
                    });
                  }
                }}
                readOnly={!editing}
                required={editing}
                placeholder={editing ? 'Seu nome completo' : '—'}
                className={inputClass(Boolean(fieldErrors.displayName))}
              />
            </div>
            {editing && fieldErrors.displayName && (
              <p className="text-[11px] text-rose-300 mt-1">{fieldErrors.displayName}</p>
            )}
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1 text-xs">
              E-mail <span className="text-stone-600 font-normal">(opcional · login)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <input
                value={email}
                readOnly
                placeholder="Não informado"
                className="w-full bg-stone-950/50 border border-stone-800/80 rounded-xl p-3 pl-10 text-stone-400 cursor-not-allowed"
              />
            </div>
            {editing && (
              <p className="text-[11px] text-stone-500 mt-1">
                {canLoginWithEmail
                  ? 'Este e-mail é usado para entrar na conta (magic link).'
                  : 'Sem e-mail cadastrado não é possível fazer login.'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1 text-xs">Telefone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={!editing}
                placeholder={editing ? '(00) 00000-0000' : '—'}
                inputMode="tel"
                className={inputClass()}
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1 text-xs">
              Data de nascimento
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                readOnly={!editing}
                disabled={!editing}
                max={new Date().toISOString().slice(0, 10)}
                className={`${inputClass()} disabled:opacity-100`}
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1 text-xs">
              Membro da igreja{' '}
              {editing && <span className="text-stone-600 font-normal">(opcional)</span>}
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
              {editing ? (
                <select
                  value={churchId}
                  onChange={(e) => setChurchId(e.target.value)}
                  className={`${inputClass()} appearance-none`}
                >
                  <option value="">Não informado</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={selectedChurchName || (churchId ? 'Igreja não listada' : '')}
                  readOnly
                  placeholder="—"
                  className={inputClass()}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-2 text-xs">
              Minhas habilidades
            </label>

            {editing ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {KNOWN_SKILLS.map((skill) => {
                    const selected = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
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

                {customSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {customSkills.map((skill) => (
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
                {availableKnownSkills.length === 0 && (
                  <p className="text-[11px] text-stone-500 mt-1.5">
                    Todas as habilidades da lista foram selecionadas.
                  </p>
                )}
              </>
            ) : skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1.5 rounded-button text-[11px] font-semibold bg-stone-950 text-emerald-200 border border-emerald-800/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500">Nenhuma habilidade informada.</p>
            )}
          </div>

          {editing && (
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 font-bold rounded-button flex items-center justify-center gap-2 text-sm"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar perfil
            </button>
          )}
        </form>
        </div>
      </div>

      {cameraOpen && (
        <CameraCaptureDialog
          onCancel={() => setCameraOpen(false)}
          onCapture={(imageSrc) => {
            setCameraOpen(false);
            setCropSrc(imageSrc);
          }}
        />
      )}

      {cropSrc && (
        <AvatarCropDialog
          imageSrc={cropSrc}
          onCancel={() => {
            if (cropSrc.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={(blob) => {
            if (cropSrc.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            void uploadAvatarBlob(blob);
          }}
        />
      )}
    </div>
  );
};
