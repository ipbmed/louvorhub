import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Mail, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import {
  acceptOrgInvitation,
  acceptOrgInvitationAsGuest,
  getOrgInvitationPublic,
  type PublicOrgInvitation,
} from '@/services/invitations';

export const InviteAcceptPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refreshMemberships } = useAuth();
  const [invite, setInvite] = useState<PublicOrgInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg('');
    void getOrgInvitationPublic(token)
      .then((row) => {
        if (cancelled) return;
        setInvite(row);
        if (row?.displayName) setName(row.displayName);
        if (!row) setErrorMsg('Convite não encontrado.');
        else if (row.status === 'expired') setErrorMsg('Este convite expirou.');
        else if (row.status === 'revoked') setErrorMsg('Este convite foi cancelado.');
        else if (row.status === 'accepted') {
          setSuccessMsg('Convite já aceito. Você já pode entrar com este e-mail.');
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorMsg((err as Error).message || 'Convite inválido.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!invite || invite.status !== 'pending') return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (user) {
        await acceptOrgInvitation(token);
        await refreshMemberships();
        setSuccessMsg(`Você foi associado a ${invite.orgName}.`);
      } else {
        if (!name.trim()) {
          setErrorMsg('Informe seu nome para criar a conta.');
          setSaving(false);
          return;
        }
        const result = await acceptOrgInvitationAsGuest({ token, name });
        setSuccessMsg(result.message);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível aceitar o convite.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-emerald-100">Convite para igreja</h1>
            <p className="text-xs text-stone-500">LouvorHub</p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : (
          <>
            {invite && (
              <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3 space-y-1.5 text-sm">
                <p className="font-semibold text-stone-100">{invite.orgName}</p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {invite.email}
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-200 flex gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-200 flex gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                {successMsg}
              </div>
            )}

            {invite?.status === 'pending' && !successMsg && (
              <div className="space-y-3">
                {!user && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      Seu nome
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-sm text-stone-100"
                    />
                    <p className="text-[11px] text-stone-500 mt-1.5">
                      Se ainda não tiver conta, ela será criada e aprovada automaticamente com o
                      e-mail do convite.
                    </p>
                  </div>
                )}

                {user && (
                  <p className="text-xs text-stone-400">
                    Você está logado. Ao aceitar, sua conta será associada a esta igreja.
                  </p>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleAccept()}
                  className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 font-bold rounded-button text-sm inline-flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Aceitar convite
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
            >
              Voltar ao início
            </button>
          </>
        )}
      </div>
    </div>
  );
};
