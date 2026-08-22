import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, UserPlus, AlertCircle } from 'lucide-react';
import { registerAccount } from '@/services/accounts';

interface RegisterPageProps {
  onBack: () => void;
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onBack, onGoToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Nome e e-mail são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const message = await registerAccount(name, email);
      setSuccessMsg(message);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Não foi possível enviar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-in fade-in duration-300">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-stone-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às músicas
      </button>

      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-stone-50">Criar conta</h1>
            <p className="text-xs text-stone-500">Cadastro geral do LouvorHub</p>
          </div>
        </div>

        <p className="text-sm text-stone-400 leading-relaxed">
          Preencha seus dados para solicitar acesso. Após a aprovação do administrador, você poderá
          entrar com magic link no e-mail informado.
        </p>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800/60 rounded-2xl p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm text-emerald-100 font-semibold">Cadastro enviado!</p>
            <p className="text-xs text-stone-400">{successMsg}</p>
            <button
              type="button"
              onClick={onGoToLogin}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
            >
              Ir para entrar
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 text-sm">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">Nome completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
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
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 font-bold rounded-button flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar cadastro
            </button>
          </form>
        )}

        {!successMsg && (
          <p className="text-xs text-stone-500 text-center">
            Já possui cadastro aprovado?{' '}
            <button type="button" onClick={onGoToLogin} className="text-emerald-400 hover:text-emerald-300 font-semibold">
              Entrar
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
