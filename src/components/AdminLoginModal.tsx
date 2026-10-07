import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Logo } from './Logo';
import { Alert, Button, Field, Input, Modal } from './ui';

interface AdminLoginModalProps {
  onClose: () => void;
  onSent?: () => void;
  onGoToRegister?: () => void;
}

/**
 * Login por link mágico. No desktop é um diálogo centralizado; no celular vira
 * uma tela cheia com o conteúdo no topo, para o teclado não cobrir o formulário.
 */
export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  onClose,
  onSent,
  onGoToRegister,
}) => {
  const { signInWithEmail, configured, authNotice, clearAuthNotice } = useAuth();
  const isWide = useMediaQuery('(min-width: 640px)');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authNotice) setErrorMsg(authNotice);
  }, [authNotice]);

  const handleClose = () => {
    if (loading) return;
    clearAuthNotice();
    onClose();
  };

  const handleRegister = onGoToRegister
    ? () => {
        handleClose();
        onGoToRegister();
      }
    : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    clearAuthNotice();
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
    (document.activeElement as HTMLElement | null)?.blur();
    setSent(true);
    onSent?.();
  };

  const emailField = (
    <Field label="E-mail" required>
      {(id) => (
        <Input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@igreja.org"
          autoFocus={isWide}
        />
      )}
    </Field>
  );

  const approvalNote = (
    <span className="inline-flex items-start gap-1.5">
      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        Só contas já cadastradas e aprovadas recebem o link. Ainda não tem cadastro? Crie sua conta
        e aguarde a aprovação do administrador.
      </span>
    </span>
  );

  const sentMessage = (
    <>
      <p className="text-sm text-fg font-semibold break-words">Link enviado para {email}</p>
      <p className="text-xs text-fg-muted leading-relaxed">
        Abra o e-mail neste aparelho e toque no link para entrar. Se não aparecer em alguns minutos,
        confira a caixa de spam.
      </p>
    </>
  );

  if (!isWide) {
    return (
      <LoginScreen onClose={handleClose} locked={loading}>
        {sent ? (
          <div className="text-center space-y-3 pt-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-soft border border-brand-line text-brand-text flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-fg">Verifique seu e-mail</h1>
            {sentMessage}
            <div className="pt-4">
              <Button block size="lg" onClick={handleClose}>
                Voltar ao catálogo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center pt-2 pb-7">
              <Logo size="lg" className="flex-col gap-3" />
              <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-fg">Entrar</h1>
              <p className="mt-1 text-sm text-fg-muted">
                Receba o link de acesso para no seu e-mail.
              </p>
            </div>
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
              {errorMsg && <Alert tone="danger">{errorMsg}</Alert>}
              {emailField}
              <Button type="submit" block size="lg" loading={loading} icon={Mail}>
                Enviar link de acesso
              </Button>
            </form>
            {handleRegister && (
              <p className="mt-6 text-center text-sm text-fg-muted">
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={handleRegister}
                  className="font-bold text-brand-text underline-offset-4 hover:underline"
                >
                  Criar conta
                </button>
              </p>
            )}
            <div className="mt-8">
              <Alert tone="info">{approvalNote}</Alert>
            </div>
          </>
        )}
      </LoginScreen>
    );
  }

  return (
    <Modal
      open
      onClose={handleClose}
      locked={loading}
      icon={sent ? ShieldCheck : Mail}
      title={sent ? 'Verifique seu e-mail' : 'Entrar no LouvorHub'}
      subtitle={sent ? undefined : 'Sem senha: enviamos um link de acesso para o seu e-mail.'}
      size="sm"
      footer={
        sent ? (
          <Button block onClick={handleClose}>
            Fechar
          </Button>
        ) : (
          <>
            {handleRegister && (
              <Button variant="ghost" onClick={handleRegister} className="mr-auto">
                Criar conta
              </Button>
            )}
            <Button type="submit" form="login-form" loading={loading} icon={Mail}>
              Enviar link de acesso
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="text-center space-y-3 py-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-soft border border-brand-line text-brand-text flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          {sentMessage}
        </div>
      ) : (
        <form id="login-form" onSubmit={(e) => void handleLogin(e)} className="space-y-4">
          <Alert tone="info">{approvalNote}</Alert>
          {errorMsg && <Alert tone="danger">{errorMsg}</Alert>}
          {emailField}
        </form>
      )}
    </Modal>
  );
};

const LoginScreen: React.FC<{ onClose: () => void; locked: boolean; children: React.ReactNode }> = ({
  onClose,
  locked,
  children,
}) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Entrar no LouvorHub"
      className="fixed inset-0 z-50 bg-app text-fg overflow-y-auto overscroll-contain pt-safe pb-safe animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center h-14 px-2">
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-button text-sm font-semibold text-fg-muted hover:text-fg hover:bg-muted disabled:opacity-40"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
      </div>
      <div className="w-full max-w-sm mx-auto px-6 pb-10">{children}</div>
    </div>
  );
};
