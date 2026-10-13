import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { LiturgyItem, ScheduleMemberAssignment, Song } from '@/types';
import type { AssistantAssignment, AssistantTeamMember } from '@/services/assistant';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';

interface ScreenBase {
  /** Identifica a conversa: trocar de evento/aba abre outra conversa. */
  key: string;
  /** Subtítulo exibido no painel (ex.: "Liturgia · Culto 12/10"). */
  label: string;
}

export interface SetlistScreen extends ScreenBase {
  mode: 'setlist';
  eventId: string;
  theme?: string;
  bibleVerse?: string;
  songs: Song[];
  existingSongIds: string[];
  canApply: boolean;
  onAddSongs: (songIds: string[]) => Promise<void>;
}

export interface LiturgyScreen extends ScreenBase {
  mode: 'liturgy';
  eventId: string;
  theme?: string;
  bibleVerse?: string;
  preacher?: string;
  leader?: string;
  songs: Song[];
  items: LiturgyItem[];
  canApply: boolean;
  onApplyLiturgy: (items: LiturgyItem[], meta: { theme?: string; bibleVerse?: string }) => Promise<void>;
}

export interface ScheduleScreen extends ScreenBase {
  mode: 'schedule';
  eventId: string;
  theme?: string;
  members: AssistantTeamMember[];
  roles: string[];
  assignments: ScheduleMemberAssignment[];
  canApply: boolean;
  onApplyTeam: (assignments: AssistantAssignment[]) => Promise<void>;
}

export interface CatalogScreen extends ScreenBase {
  mode: 'catalog';
  songs: Song[];
  onOpenSong: (song: Song) => void;
}

export type AssistantScreen = SetlistScreen | LiturgyScreen | ScheduleScreen | CatalogScreen;

type Owner = symbol;

const RegisterContext = createContext<{
  set: (owner: Owner, screen: AssistantScreen | null) => void;
} | null>(null);

interface LauncherState {
  /** Modo da tela atual; `null` quando a tela não tem assistente. */
  mode: AssistantScreen['mode'] | null;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const LauncherContext = createContext<LauncherState>({ mode: null, isOpen: false, setOpen: () => {} });

/** Painel de IA: cada tela registra seu contexto e as ações que a proposta pode aplicar. */
export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState<{ owner: Owner; screen: AssistantScreen } | null>(null);
  const [isOpen, setOpen] = useState(false);

  const set = useCallback((owner: Owner, screen: AssistantScreen | null) => {
    setEntry((prev) => {
      if (screen) return { owner, screen };
      return prev?.owner === owner ? null : prev;
    });
  }, []);

  const registerValue = useRef({ set }).current;
  const screen = entry?.screen ?? null;
  const mode = screen?.mode ?? null;

  useEffect(() => {
    if (!mode) setOpen(false);
  }, [mode]);

  const launcherValue = useMemo<LauncherState>(() => ({ mode, isOpen, setOpen }), [mode, isOpen]);

  return (
    <RegisterContext.Provider value={registerValue}>
      <LauncherContext.Provider value={launcherValue}>
        {children}
        <AssistantLauncher screen={screen} open={isOpen} onOpenChange={setOpen} />
      </LauncherContext.Provider>
    </RegisterContext.Provider>
  );
}

/** Estado do painel para o botão do cabeçalho. */
export function useAssistantLauncher(): LauncherState {
  return useContext(LauncherContext);
}

/** Registra (ou remove, com `null`) o contexto do assistente para a tela atual. */
export function useAssistantScreen(screen: AssistantScreen | null): void {
  const ctx = useContext(RegisterContext);
  const owner = useRef<Owner>(Symbol('assistant-screen')).current;

  useEffect(() => {
    ctx?.set(owner, screen);
  }, [ctx, owner, screen]);

  useEffect(() => () => ctx?.set(owner, null), [ctx, owner]);
}
