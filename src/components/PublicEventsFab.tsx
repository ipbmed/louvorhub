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
}

/** Notificação de eventos públicos no header. */
export const PublicEventsFab: React.FC<PublicEventsFabProps> = ({ enabled = true }) => {
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
        className={`relative p-2 sm:px-3 sm:py-2 rounded-button text-xs font-medium flex items-center gap-1.5 transition-all border ${
          open
            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-sm'
            : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700/80 hover:text-emerald-300'
        }`}
        title="Eventos disponíveis"
        aria-label="Eventos disponíveis"
        aria-expanded={open}
      >
        <CalendarDays className="w-4 h-4" />
        <span className="hidden sm:inline">Eventos</span>
        <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-emerald-500 text-stone-950 text-[9px] font-black flex items-center justify-center border border-stone-900 shadow-sm">
          {orgs.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {showEventsStep && selectedOrg ? (
                <>
                  <h3 className="text-sm font-bold text-stone-100 truncate">
                    {selectedOrg.sigla || selectedOrg.name}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {loadingEvents
                      ? 'Carregando…'
                      : `${events.length} evento${events.length === 1 ? '' : 's'}`}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-stone-100">Eventos públicos</h3>
                  <p className="text-[11px] text-stone-500">
                    Escolha a igreja para ver os cultos compartilhados
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-button text-stone-400 hover:text-stone-100 hover:bg-stone-800 shrink-0"
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
                    className="w-full text-left px-4 py-3 hover:bg-stone-800/70 transition-colors flex items-start gap-3"
                  >
                    <span className="mt-0.5 w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-700/40 text-emerald-300 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-display font-bold text-stone-100 truncate">
                        {org.name}
                      </span>
                      {(org.sigla || org.city) && (
                        <span className="block text-[11px] text-stone-500 mt-0.5 truncate">
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
                        className="w-full text-left px-4 py-3 hover:bg-stone-800/70 transition-colors"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                          {ev.time ? ` · ${ev.time.slice(0, 5)}` : ''}
                        </p>
                        <p className="text-sm font-display font-bold text-stone-100 mt-0.5">
                          {ev.title}
                        </p>
                        {ev.theme && (
                          <p className="text-[11px] text-stone-500 mt-0.5 truncate">
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
