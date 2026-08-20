import React, { useState } from 'react';
import { X, Mail, ShieldCheck, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';

interface AdminLoginModalProps {
  onClose: () => void;
  onSent?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onSent }) => {
  const { signInWithEmail, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!configured) {
      setErrorMsg('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim());
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    setSent(true);
    onSent?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-stone-100 relative">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/30 shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-emerald-100 tracking-tight">Entrar no LouvorHub</h3>
              <p className="text-xs text-stone-400">Magic link por e-mail (Supabase Auth)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-3.5 mb-6 text-xs text-emerald-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Enviaremos um link de acesso para o seu e-mail. Após clicar no link, você volta ao app
            autenticado e com permissões da(s) sua(s) igreja(s).
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800/60 rounded-2xl p-3 mb-4 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {sent ? (
          <div className="text-center space-y-3 py-4">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm text-emerald-100 font-semibold">Link enviado!</p>
            <p className="text-xs text-stone-400">
              Verifique sua caixa de entrada ({email}) e abra o magic link para entrar.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-button text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@igreja.org"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 font-bold rounded-button shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm transition-all mt-6"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              <span>Enviar magic link</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
