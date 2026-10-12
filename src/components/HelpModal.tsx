import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Church,
  HelpCircle,
  ListMusic,
  Maximize2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ActionButton } from './ui';

export type HelpTopicId =
  | 'start'
  | 'catalog'
  | 'reader'
  | 'playlists'
  | 'church'
  | 'members'
  | 'events'
  | 'admin';

type HelpTopic = {
  id: HelpTopicId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  points: string[];
};

const TOPICS: HelpTopic[] = [
  {
    id: 'start',
    label: 'Começar',
    icon: HelpCircle,
    title: 'Bem-vindo ao LouvorHub',
    summary:
      'Central de hinário, cifras, playlists e organização da igreja para o ministério de louvor.',
    points: [
      'Visitantes podem consultar o catálogo e eventos públicos sem login.',
      'Para playlists, favoritos e áreas da igreja, use Entrar com o e-mail (magic link).',
      'Se ainda não tiver conta, faça o Cadastro geral e aguarde a aprovação do administrador.',
      'No celular, abra o menu (☰) para navegar entre Catálogo, Playlists e a igreja ativa.',
    ],
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    icon: Search,
    title: 'Buscar músicas',
    summary: 'Encontre hinos e cânticos por número, título, trecho da letra ou filtros avançados.',
    points: [
      'Digite na busca do topo em qualquer tela — o app abre o Catálogo com os resultados.',
      'Use o botão Nº para o teclado numérico rápido de hinário.',
      'Filtros avançados (ícone de sliders): tipo, hinário, faixa de número, categoria, tom e autor.',
      'Alterne entre Cards e Lista; filtre por letra, favoritos, hinos ou cânticos.',
    ],
  },
  {
    id: 'reader',
    label: 'Leitura',
    icon: Maximize2,
    title: 'Letra, cifra e telão',
    summary: 'Abra uma música para estudar, ensaiar ou projetar.',
    points: [
      'Modo letra: mostra as partes cantadas (estrofe, refrão, ponte…).',
      'Modo cifra: inclui cifras, introduções, solos e comentários (###).',
      'Links: YouTube, Spotify e outros ficam no painel de Links e rolam junto com a letra.',
      'Telão: projeta slides; use --- ou // na letra para forçar quebra de página.',
      'Metrônomo e ajuste de fonte ficam na barra da música.',
    ],
  },
  {
    id: 'playlists',
    label: 'Playlists',
    icon: ListMusic,
    title: 'Playlists pessoais',
    summary: 'Monte repertórios seus, compartilhe por link e adicione músicas a partir do catálogo.',
    points: [
      'Crie playlists em Playlists; defina privacidade (privada ou com link).',
      'No catálogo, use “Adicionar à playlist” no card ou na lista da música.',
      'Playlists com link público podem ser abertas sem login.',
    ],
  },
  {
    id: 'church',
    label: 'Igreja',
    icon: Church,
    title: 'Workspace da igreja',
    summary: 'Cada igreja tem eventos, grupos/bandas e membros no menu da igreja ativa.',
    points: [
      'Troque de igreja no seletor da sidebar se você participar de mais de uma.',
      'Grupos & Bandas: equipes de louvor da congregação.',
      'Visão geral resume o workspace; as abas levam a Eventos, Grupos e Membros.',
      'Editores da igreja veem as áreas conforme as permissões concedidas.',
    ],
  },
  {
    id: 'members',
    label: 'Membros',
    icon: UserPlus,
    title: 'Membros e contas',
    summary: 'Contas do sistema e membros da igreja são coisas diferentes.',
    points: [
      'Contas de usuários (admin): cadastro completo da conta no LouvorHub (aprovação, admin).',
      'Membros (igreja): quem faz parte da congregação ativa.',
      'Convidar: envia link por e-mail; ao aceitar, a conta é criada (se preciso) e associada à igreja.',
      'Associar: busca uma conta já cadastrada e vincula à igreja.',
      'Permissões (editor da igreja, editor de grupo, liturgo) são ajustadas ao editar o membro.',
    ],
  },
  {
    id: 'events',
    label: 'Eventos',
    icon: Calendar,
    title: 'Eventos e culto',
    summary: 'Organize cultos e ensaios com equipe, liturgia e repertório.',
    points: [
      'Visualize em Calendário, Mensal, Semana ou Programação.',
      'Dentro do evento: equipe de louvor, liturgia e repertório do culto.',
      'Eventos podem ser compartilhados publicamente quando habilitado.',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    title: 'Administração',
    summary: 'Ferramentas exclusivas de administrador do sistema.',
    points: [
      'Músicas: cadastrar, editar, importar/exportar e revisar cifras.',
      'Igrejas: cadastro geral das organizações.',
      'Contas de usuários: criar contas, aprovar cadastros e definir administradores.',
      'No editor de letra, use Ajuda para marcadores [ESTROFE], [REFRAO], cifras e telão.',
    ],
  },
];

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  initialTopic?: HelpTopicId;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  open,
  onClose,
  initialTopic = 'start',
}) => {
  const [activeId, setActiveId] = useState<HelpTopicId>(initialTopic);

  useEffect(() => {
    if (open) setActiveId(initialTopic);
  }, [open, initialTopic]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const active = TOPICS.find((t) => t.id === activeId) || TOPICS[0];
  const ActiveIcon = active.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-help-title"
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl max-h-[min(90vh,720px)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="app-help-title"
                className="text-base sm:text-lg font-display font-bold text-emerald-100 truncate"
              >
                Ajuda do LouvorHub
              </h2>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Guia rápido das principais funções
              </p>
            </div>
          </div>
          <ActionButton variant="light" icon={X} onClick={onClose} aria-label="Fechar ajuda" title="Fechar ajuda" />
        </div>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          <nav
            className="shrink-0 sm:w-44 border-b sm:border-b-0 sm:border-r border-stone-800 p-2 overflow-x-auto sm:overflow-y-auto"
            aria-label="Tópicos de ajuda"
          >
            <div className="flex sm:flex-col gap-1">
              {TOPICS.map((topic) => {
                const Icon = topic.icon;
                const selected = topic.id === activeId;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveId(topic.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-button text-xs font-semibold whitespace-nowrap transition-colors ${
                      selected
                        ? 'bg-emerald-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-950 border border-stone-800 text-emerald-300 flex items-center justify-center shrink-0">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-display font-bold text-stone-100">{active.title}</h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">{active.summary}</p>
              </div>
            </div>

            <ul className="space-y-2.5 pt-1">
              {active.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-2.5 text-sm text-stone-300 leading-relaxed"
                >
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {activeId === 'start' && (
              <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/50 px-3.5 py-3 text-xs text-stone-400 leading-relaxed flex gap-2">
                <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Dúvidas de acesso ou permissão na igreja: fale com o administrador do LouvorHub ou
                  com o editor da sua congregação.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
