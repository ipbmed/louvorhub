import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogIn, Mail, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Logo } from './Logo';
import { ActionButton, Alert, Field, Input, Modal } from './ui';

const CODE_LENGTH = 6;
/** Intervalo mínimo do Supabase entre dois envios para o mesmo e-mail. */
const RESEND_SECONDS = 60;

interface AdminLoginModalProps {
  onClose: () => void;
  onSent?: () => void;
  onGoToRegister?: () => void;
}

/**
 * Login sem senha: o e-mail traz um código de 6 dígitos (digitado aqui) e também o link mágico.
 * No desktop é um diálogo centralizado; no celular vira uma tela cheia com o conteúdo no topo,
 * para o teclado não cobrir o formulário.
 */
export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  onClose,
  onSent,
  onGoToRegister,
}) => {
  const { signInWithEmail, verifyEmailCode, configured, authNotice, clearAuthNotice } = useAuth();
  const isWide = useMediaQuery('(min-width: 640px)');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const lastSubmittedCode = useRef('');

  useEffect(() => {
    if (authNotice) setErrorMsg(authNotice);
  }, [authNotice]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (sent) codeRef.current?.focus();
  }, [sent]);

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

  const sendCode = async () => {
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
    setCode('');
    lastSubmittedCode.current = '';
    setResendIn(RESEND_SECONDS);
    setSent(true);
    onSent?.();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCode();
  };

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH || loading) return;
    lastSubmittedCode.current = value;
    setErrorMsg('');
    clearAuthNotice();
    setLoading(true);
    const { error } = await verifyEmailCode(email.trim(), value);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      requestAnimationFrame(() => codeRef.current?.select());
      return;
    }
    onClose();
  };

  const handleCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (errorMsg) setErrorMsg('');
    if (digits.length === CODE_LENGTH && digits !== lastSubmittedCode.current) void verify(digits);
  };

  const changeEmail = () => {
    setSent(false);
    setCode('');
    setErrorMsg('');
    clearAuthNotice();
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
        Só contas já cadastradas e aprovadas recebem o código. Ainda não tem cadastro? Crie sua conta
        e aguarde a aprovação do administrador.
      </span>
    </span>
  );

  const codeForm = (
    <form
      id="otp-form"
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="space-y-4"
    >
      <div className="text-center space-y-1.5">
        <p className="text-sm text-fg">
          Enviamos um código de {CODE_LENGTH} dígitos para{' '}
          <strong className="font-semibold break-words">{email.trim()}</strong>
        </p>
        <p className="text-xs text-fg-muted leading-relaxed">
          Digite o código abaixo ou toque no link do e-mail. Não chegou? Confira a caixa de spam.
        </p>
      </div>

      <Field label="Código de acesso">
        {(id) => (
          <Input
            ref={codeRef}
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={CODE_LENGTH}
            enterKeyHint="go"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={'•'.repeat(CODE_LENGTH)}
            readOnly={loading}
            className="text-center font-mono text-2xl tracking-[0.5em] h-14 placeholder:tracking-[0.5em]"
          />
        )}
      </Field>

      {errorMsg && <Alert tone="danger">{errorMsg}</Alert>}

      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={changeEmail}
          disabled={loading}
          className="font-semibold text-fg-muted hover:text-fg disabled:opacity-50"
        >
          Trocar e-mail
        </button>
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={loading || resendIn > 0}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-text hover:underline underline-offset-4 disabled:text-fg-subtle disabled:no-underline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );

  const verifyButton = (
    <ActionButton
      type="submit"
      form="otp-form"
      variant="primary"
      icon={LogIn}
      loading={loading}
      disabled={code.length !== CODE_LENGTH}
      className={isWide ? undefined : 'w-full'}
    >
      Entrar
    </ActionButton>
  );

  if (!isWide) {
    return (
      <LoginScreen onClose={handleClose} locked={loading}>
        {sent ? (
          <div className="space-y-5 pt-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-soft border border-brand-line text-brand-text flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-fg">Verifique seu e-mail</h1>
            </div>
            {codeForm}
            {verifyButton}
          </div>
        ) : (
          <>
            <div className="text-center pt-2 pb-7">
              <Logo size="lg" className="flex-col gap-3" />
              <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-fg">Entrar</h1>
              <p className="mt-1 text-sm text-fg-muted">
                Receba um código de acesso no seu e-mail.
              </p>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              {errorMsg && <Alert tone="danger">{errorMsg}</Alert>}
              {emailField}
              <ActionButton type="submit" variant="primary" className="w-full" loading={loading} icon={Mail}>
                Enviar código
              </ActionButton>
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
      subtitle={sent ? undefined : 'Sem senha: enviamos um código de acesso para o seu e-mail.'}
      size="sm"
      footer={
        sent ? (
          <>
            <ActionButton variant="light" onClick={handleClose} disabled={loading} className="mr-auto">
              Cancelar
            </ActionButton>
            {verifyButton}
          </>
        ) : (
          <>
            {handleRegister && (
              <ActionButton variant="light" onClick={handleRegister} className="mr-auto">
                Criar conta
              </ActionButton>
            )}
            <ActionButton type="submit" form="login-form" variant="primary" loading={loading} icon={Mail}>
              Enviar código
            </ActionButton>
          </>
        )
      }
    >
      {sent ? (
        codeForm
      ) : (
        <form id="login-form" onSubmit={handleSend} className="space-y-4">
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
        <ActionButton variant="light" icon={ArrowLeft} onClick={onClose} disabled={locked}>
          Voltar
        </ActionButton>
      </div>
      <div className="w-full max-w-sm mx-auto px-6 pb-10">{children}</div>
    </div>
  );
};
