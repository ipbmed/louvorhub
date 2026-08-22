import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { DbMembership, DbProfile } from '@/lib/dbTypes';
import type { AccountStatus } from '@/types';
import { getMyAccountStatus } from '@/services/accounts';

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  memberships: DbMembership[];
  accountStatus: AccountStatus | null;
  authNotice: string | null;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuthNotice: () => void;
  configured: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function accountBlockedMessage(status: AccountStatus | null): string | null {
  if (status === 'pending') {
    return 'Seu cadastro aguarda aprovação do administrador. Você receberá acesso após a aprovação.';
  }
  if (status === 'rejected') {
    return 'Seu cadastro não foi aprovado. Entre em contato com o administrador do LouvorHub.';
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [memberships, setMemberships] = useState<DbMembership[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const refreshMemberships = useCallback(async () => {
    if (!isSupabaseConfigured || !session?.user) {
      setMemberships([]);
      return;
    }
    const { data } = await supabase
      .from('memberships')
      .select('*, organizations(*)')
      .eq('user_id', session.user.id);
    setMemberships((data as DbMembership[]) || []);
  }, [session?.user]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !session?.user) {
      setProfile(null);
      setAccountStatus(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    const nextProfile = data as DbProfile | null;
    setProfile(nextProfile);
    setAccountStatus((nextProfile?.account_status as AccountStatus | undefined) ?? null);
  }, [session?.user]);

  const enforceApprovedSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setAccountStatus(null);
      return true;
    }

    const status = await getMyAccountStatus(nextSession.user.id);
    const blocked = accountBlockedMessage(status);
    if (blocked) {
      setAuthNotice(blocked);
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setMemberships([]);
      setAccountStatus(status);
      return false;
    }

    setAccountStatus(status);
    setAuthNotice(null);
    return true;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const allowed = await enforceApprovedSession(data.session);
      if (allowed) setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      const allowed = await enforceApprovedSession(next);
      setSession(allowed ? next : null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [enforceApprovedSession]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user) {
      setProfile(null);
      setMemberships([]);
      if (!session?.user) setAccountStatus(null);
      return;
    }
    void (async () => {
      await refreshProfile();
      await refreshMemberships();
    })();
  }, [session, refreshMemberships, refreshProfile]);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' };
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      const msg = error.message || '';
      if (/signups not allowed|user not found|invalid login credentials/i.test(msg)) {
        return {
          error:
            'E-mail não cadastrado ou ainda não aprovado. Crie sua conta e aguarde a aprovação do administrador.',
        };
      }
      if (/rate limit/i.test(msg)) {
        return {
          error: 'Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.',
        };
      }
      return { error: msg };
    }

    return {};
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setAuthNotice(null);
  }, []);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      memberships,
      accountStatus,
      authNotice,
      signInWithEmail,
      signOut,
      refreshMemberships,
      refreshProfile,
      clearAuthNotice,
      configured: isSupabaseConfigured,
    }),
    [
      ready,
      session,
      profile,
      memberships,
      accountStatus,
      authNotice,
      signInWithEmail,
      signOut,
      refreshMemberships,
      refreshProfile,
      clearAuthNotice,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
