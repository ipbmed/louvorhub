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

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: DbProfile | null;
  memberships: DbMembership[];
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  configured: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [memberships, setMemberships] = useState<DbMembership[]>([]);

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
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    setProfile(data as DbProfile | null);
  }, [session?.user]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user) {
      setProfile(null);
      setMemberships([]);
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
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      memberships,
      signInWithEmail,
      signOut,
      refreshMemberships,
      refreshProfile,
      configured: isSupabaseConfigured,
    }),
    [
      ready,
      session,
      profile,
      memberships,
      signInWithEmail,
      signOut,
      refreshMemberships,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
