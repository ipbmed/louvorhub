import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { Catalog, CatalogSong } from "./catalog.ts";

export interface RecentUsage {
  song: CatalogSong;
  dates: string[];
}

/** Músicas tocadas em eventos da organização nas últimas `weeks` semanas (exceto o evento atual). */
export async function loadRecentUsage(
  sb: SupabaseClient,
  catalog: Catalog,
  params: { orgId: string; weeks: number; excludeEventId?: string | null },
): Promise<RecentUsage[]> {
  if (params.weeks <= 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - params.weeks * 7);
  const sinceDate = since.toISOString().slice(0, 10);

  let query = sb
    .from("event_songs")
    .select("song_id, event_id, events!inner(org_id, service_date)")
    .eq("events.org_id", params.orgId)
    .gte("events.service_date", sinceDate);
  if (params.excludeEventId) query = query.neq("event_id", params.excludeEventId);

  const { data, error } = await query;
  if (error) throw error;

  const byId = new Map<string, Set<string>>();
  for (const row of (data || []) as unknown as {
    song_id: string;
    events: { service_date: string } | { service_date: string }[];
  }[]) {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!event) continue;
    const dates = byId.get(row.song_id) || new Set<string>();
    dates.add(event.service_date);
    byId.set(row.song_id, dates);
  }

  const usage: RecentUsage[] = [];
  for (const [songId, dates] of byId) {
    const song = catalog.byId.get(songId);
    if (!song) continue;
    usage.push({ song, dates: [...dates].sort().reverse() });
  }
  return usage.sort((a, b) => b.dates[0].localeCompare(a.dates[0]));
}

export interface TeamUsage {
  key: string;
  count: number;
  lastDate: string;
  roles: string[];
  declined: number;
}

/** Participação em escalas da organização nas últimas `weeks` semanas, por usuário (ou nome). */
export async function loadTeamHistory(
  sb: SupabaseClient,
  params: { orgId: string; weeks: number; excludeEventId?: string | null },
): Promise<Map<string, TeamUsage>> {
  const result = new Map<string, TeamUsage>();
  if (params.weeks <= 0) return result;

  const since = new Date();
  since.setDate(since.getDate() - params.weeks * 7);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await sb
    .from("schedule_assignments")
    .select(
      "user_id, person_name, role_label, availability_status, schedules!inner(org_id, event_id, events(service_date))",
    )
    .eq("schedules.org_id", params.orgId)
    .limit(3000);
  if (error) throw error;

  type Row = {
    user_id: string | null;
    person_name: string | null;
    role_label: string;
    availability_status: string | null;
    schedules: {
      event_id: string | null;
      events: { service_date: string } | { service_date: string }[] | null;
    } | null;
  };

  for (const row of (data || []) as unknown as Row[]) {
    const schedule = Array.isArray(row.schedules) ? row.schedules[0] : row.schedules;
    if (!schedule || (params.excludeEventId && schedule.event_id === params.excludeEventId)) continue;
    const event = Array.isArray(schedule.events) ? schedule.events[0] : schedule.events;
    const date = event?.service_date;
    if (!date || date < sinceDate) continue;

    const key = row.user_id || `name:${(row.person_name || "").trim().toLowerCase()}`;
    const usage = result.get(key) || { key, count: 0, lastDate: date, roles: [], declined: 0 };
    usage.count += 1;
    if (date > usage.lastDate) usage.lastDate = date;
    if (row.role_label && !usage.roles.includes(row.role_label)) usage.roles.push(row.role_label);
    if (row.availability_status === "declined") usage.declined += 1;
    result.set(key, usage);
  }
  return result;
}
