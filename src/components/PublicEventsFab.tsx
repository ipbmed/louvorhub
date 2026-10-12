import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Loader2, X } from 'lucide-react';
import {
  listPublicSharedEvents,
  listPublicSharedOrgs,
  type PublicSharedEventSummary,
  type PublicSharedOrgSummary,
} from '@/services/eventShare';

interface PublicEventsFabProps {
  /** Quando false, não renderiza (ex.: usuário logado). */
  enabled?: boolean;
  /** `rail`: botão redondo só com ícone; o painel abre à direita. */
  variant?: 'header' | 'rail';
}

/** Notificação de eventos públicos no header. */
export const PublicEventsFab: React.FC<PublicEventsFabProps> = ({ enabled = true, variant = 'header' }) => {
  const isRail = variant === 'rail';
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [orgs, setOrgs] = useState<PublicSharedOrgSummary[]>([]);
  const [events, setEvents] = useState<PublicSharedEventSummary[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoadingOrgs(true);
    void (async () => {
      try {
        const rows = await listPublicSharedOrgs();
        if (!cancelled) setOrgs(rows);
      } catch {
        if (!cancelled) setOrgs([]);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!selectedOrgId) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoadingEvents(true);
    void (async () => {
      try {
        const rows = await listPublicSharedEvents(selectedOrgId);
        if (!cancelled) setEvents(rows);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOrgId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) || null;
  const showChurchStep = open && !selectedOrgId;
  const showEventsStep = open && Boolean(selectedOrgId);

  if (!enabled || loadingOrgs || orgs.length === 0) return null;

  const pickOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
  };

  const clearOrg = () => {
    setSelectedOrgId(null);
  };

  const toggleOpen = () => {
    setSelectedOrgId(null);
    setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className={
          isRail
            ? `relative w-11 h-11 !rounded-full flex items-center justify-center transition-colors ${
                open ? 'bg-muted text-fg' : 'text-fg-muted hover:bg-muted hover:text-fg'
              }`
            : `relative p-2 sm:px-3 sm:py-2 rounded-button text-xs font-medium flex items-center gap-1.5 transition-all border ${
                open
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-sm'
                  : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700/80 hover:text-emerald-300'
              }`
        }
        title="Eventos disponíveis"
        aria-label="Eventos disponíveis"
        aria-expanded={open}
      >
        <CalendarDays className={isRail ? 'w-[22px] h-[22px]' : 'w-4 h-4'} />
        {!isRail && <span className="hidden sm:inline">Eventos</span>}
        <span
          className={
            isRail
              ? 'absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center ring-2 ring-surface-2'
              : 'absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-emerald-500 text-stone-950 text-[9px] font-black flex items-center justify-center border border-stone-900 shadow-sm'
          }
        >
          {orgs.length}
        </span>
      </button>

      {open && (
        <div
          className={`absolute w-[min(22rem,calc(100vw-1.5rem))] bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 ${
            isRail ? 'left-full top-0 ml-3 slide-in-from-left-2' : 'right-0 top-full mt-2 slide-in-from-top-2'
          }`}
        >
          <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {showEventsStep && selectedOrg ? (
                <>
                  <h3 className="text-sm font-bold text-stone-100 light:text-stone-900 truncate">
                    {selectedOrg.sigla || selectedOrg.name}
                  </h3>
                  <p className="text-[11px] text-stone-500 light:text-stone-600">
                    {loadingEvents
                      ? 'Carregando…'
                      : `${events.length} evento${events.length === 1 ? '' : 's'}`}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-stone-100 light:text-stone-900">Eventos públicos</h3>
                  <p className="text-[11px] text-stone-500 light:text-stone-600">
                    Escolha a igreja para ver os cultos compartilhados
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-button text-stone-400 hover:text-stone-100 light:hover:text-emerald-800 hover:bg-stone-800 light:hover:bg-emerald-100 shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {showEventsStep && (
            <div className="px-3 py-2 border-b border-stone-800">
              <button
                type="button"
                onClick={clearOrg}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Trocar igreja
              </button>
            </div>
          )}

          {showChurchStep && (
            <ul className="max-h-[min(50vh,22rem)] overflow-y-auto divide-y divide-stone-800">
              {orgs.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => pickOrg(org.id)}
                    className="w-full text-left px-4 py-3 hover:bg-stone-800/70 light:hover:bg-emerald-50 transition-colors flex items-start gap-3 group"
                  >
                    <span className="mt-0.5 w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-700/40 text-emerald-300 light:text-emerald-700 light:bg-emerald-100 light:border-emerald-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-display font-bold text-stone-100 light:text-stone-900 group-hover:text-emerald-900 truncate">
                        {org.name}
                      </span>
                      {(org.sigla || org.city) && (
                        <span className="block text-[11px] text-stone-500 light:text-stone-600 group-hover:text-emerald-700 mt-0.5 truncate">
                          {[org.sigla, org.city].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showEventsStep && (
            <div className="max-h-[min(50vh,22rem)] overflow-y-auto">
              {loadingEvents ? (
                <div className="py-10 flex justify-center text-stone-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-stone-500">
                  Nenhum evento compartilhado nesta igreja.
                </p>
              ) : (
                <ul className="divide-y divide-stone-800">
                  {events.map((ev) => (
                    <li key={ev.shareCode}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate(`/evento/${ev.shareCode}`);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-stone-800/70 light:hover:bg-emerald-50 transition-colors group"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 light:text-emerald-700 group-hover:text-emerald-800">
                          {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                          {ev.time ? ` · ${ev.time.slice(0, 5)}` : ''}
                        </p>
                        <p className="text-sm font-display font-bold text-stone-100 light:text-stone-900 group-hover:text-emerald-900 mt-0.5">
                          {ev.title}
                        </p>
                        {ev.theme && (
                          <p className="text-[11px] text-stone-500 light:text-stone-600 group-hover:text-emerald-700 mt-0.5 truncate">
                            Tema: {ev.theme}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
