import React from 'react';
import { Logo } from './Logo';
import { Avatar } from './ui/Kit';
import { AssistantHeaderButton } from './assistant/AssistantHeaderButton';

interface AppTopbarProps {
  userName: string;
  userAvatarUrl?: string | null;
  onHome: () => void;
  onProfile: () => void;
}

/** Barra superior do ambiente privado no celular/tablet: logo, assistente e avatar. */
export const AppTopbar: React.FC<AppTopbarProps> = ({ userName, userAvatarUrl, onHome, onProfile }) => (
  <header className="lg:hidden sticky top-0 z-30 pt-safe bg-app/85 backdrop-blur-md">
    <div className="h-[60px] px-4 flex items-center justify-between gap-3">
      <Logo onClick={onHome} />
      <div className="flex items-center gap-2.5">
        <AssistantHeaderButton />
        <button
          type="button"
          onClick={onProfile}
          className="!rounded-full ring-2 ring-surface shadow-card"
          aria-label="Meu perfil"
          title="Meu perfil"
        >
          <Avatar name={userName} src={userAvatarUrl} size={36} />
        </button>
      </div>
    </div>
  </header>
);
