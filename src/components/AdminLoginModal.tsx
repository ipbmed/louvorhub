import React, { useEffect, useState } from 'react';
import { Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { Alert, Button, Field, Input, Modal } from './ui';

interface AdminLoginModalProps {
  onClose: () => void;
  onSent?: () => void;
  onGoToRegister?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  onClose,
  onSent,
  onGoToRegister,
}) => {
  const { signInWithEmail, configured, authNotice, clearAuthNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authNotice) setErrorMsg(authNotice);
  }, [authNotice]);

  const handleClose = () => {
    clearAuthNotice();
    onClose();
  };

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
    setSent(true);
    onSent?.();
  };

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
            {onGoToRegister && (
              <Button
                variant="ghost"
                onClick={() => {
                  handleClose();
                  onGoToRegister();
                }}
                className="mr-auto"
              >
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
          <p className="text-sm text-fg font-semibold">Link enviado para {email}</p>
          <p className="text-xs text-fg-muted leading-relaxed">
            Abra o e-mail neste aparelho e toque no link para entrar. Se não aparecer em alguns
            minutos, confira a caixa de spam.
          </p>
        </div>
      ) : (
        <form id="login-form" onSubmit={(e) => void handleLogin(e)} className="space-y-4">
          <Alert tone="info">
            <span className="inline-flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Só contas já cadastradas e aprovadas recebem o link. Ainda não tem cadastro?
                Crie sua conta e aguarde a aprovação do administrador.
              </span>
            </span>
          </Alert>

          {errorMsg && <Alert tone="danger">{errorMsg}</Alert>}

          <Field label="E-mail" required>
            {(id) => (
              <Input
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@igreja.org"
                autoFocus
              />
            )}
          </Field>
        </form>
      )}
    </Modal>
  );
};
