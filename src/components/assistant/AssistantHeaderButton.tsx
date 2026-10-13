import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAssistantLauncher } from '@/contexts/AssistantProvider';
import { IconButton, cn } from '../ui';
import { MODE_TITLE } from './AssistantLauncher';

interface AssistantHeaderButtonProps {
  /** Classes do contêiner (ex.: visibilidade responsiva `hidden lg:flex`). */
  className?: string;
}

/** Abre o painel do assistente; só aparece nas telas que registraram contexto. */
export const AssistantHeaderButton: React.FC<AssistantHeaderButtonProps> = ({ className }) => {
  const { mode, isOpen, setOpen } = useAssistantLauncher();
  if (!mode) return null;

  return (
    <div className={cn('shrink-0', className)}>
      <IconButton
        icon={Sparkles}
        label={`Assistente: ${MODE_TITLE[mode]}`}
        variant="brand-soft"
        size="sm"
        active={isOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className="!rounded-full"
      />
    </div>
  );
};
