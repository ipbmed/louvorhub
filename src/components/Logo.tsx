import React from 'react';
import { Music2 } from 'lucide-react';
import { cn } from './ui/cn';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const MARK: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'w-8 h-8 rounded-[10px] [&_svg]:w-4 [&_svg]:h-4',
  md: 'w-[34px] h-[34px] rounded-[11px] [&_svg]:w-[18px] [&_svg]:h-[18px]',
  lg: 'w-20 h-20 rounded-3xl [&_svg]:w-10 [&_svg]:h-10',
};

const TEXT: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', onClick, className }) => {
  const content = (
    <>
      <span className={cn('btn-gradient inline-flex items-center justify-center shrink-0', MARK[size])}>
        <Music2 strokeWidth={2.4} />
      </span>
      <span className={cn('font-medium tracking-tight text-fg', TEXT[size])}>
        Louvor<b className="font-extrabold text-brand-text">Hub</b>
      </span>
    </>
  );
  const cls = cn('inline-flex items-center gap-2.5 min-w-0', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, '!rounded-lg')} aria-label="LouvorHub — início">
      {content}
    </button>
  ) : (
    <span className={cls}>{content}</span>
  );
};
