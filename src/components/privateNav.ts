import {
  CalendarDays,
  Church,
  Ellipsis,
  House,
  ListMusic,
  Music2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { ViewMode } from '@/types';

export type NavSection = 'home' | 'agenda' | 'songs' | 'playlists' | 'churches' | 'accounts' | 'more';

export interface NavEntry {
  section: NavSection;
  view: ViewMode;
  label: string;
  icon: LucideIcon;
}

export const NAV: Record<NavSection, NavEntry> = {
  home: { section: 'home', view: 'home', label: 'Início', icon: House },
  agenda: { section: 'agenda', view: 'events', label: 'Agenda', icon: CalendarDays },
  songs: { section: 'songs', view: 'public', label: 'Músicas', icon: Music2 },
  playlists: { section: 'playlists', view: 'setlist', label: 'Playlists', icon: ListMusic },
  churches: { section: 'churches', view: 'churchList', label: 'Igrejas', icon: Church },
  accounts: { section: 'accounts', view: 'accounts', label: 'Usuários', icon: UsersRound },
  more: { section: 'more', view: 'more', label: 'Mais', icon: Ellipsis },
};

const SECTION_OF_VIEW: Partial<Record<ViewMode, NavSection>> = {
  home: 'home',
  events: 'agenda',
  schedules: 'agenda',
  liturgies: 'agenda',
  public: 'songs',
  admin: 'songs',
  setlist: 'playlists',
  churchList: 'churches',
  workspace: 'churches',
  churches: 'churches',
  users: 'churches',
  organizations: 'churches',
  accounts: 'accounts',
  more: 'more',
  profile: 'more',
};

export function sectionOf(view: ViewMode): NavSection | undefined {
  return SECTION_OF_VIEW[view];
}
