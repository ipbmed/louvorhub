import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { type Catalog, loadCatalog, songLabel } from "./catalog.ts";
import { loadRecentUsage, loadTeamHistory, type RecentUsage } from "./history.ts";
import {
  type AssistantMode,
  buildCatalogPrompt,
  buildLiturgyPrompt,
  buildPlaylistPrompt,
  buildSchedulePrompt,
  buildSetlistPrompt,
  LITURGY_ITEM_TYPES,
  MODE_TOOLS,
} from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** Padrão gratuito com suporte a tool calling e contexto longo. */
const DEFAULT_MODEL = "google/gemma-4-31b-it:free";
const MODES: AssistantMode[] = ["setlist", "playlist", "catalog", "liturgy", "schedule"];
const MAX_ITERATIONS = 4;
const MAX_HISTORY_MESSAGES = 12;
const MAX_LYRICS_PER_CALL = 8;
const MAX_LYRICS_CHARS = 2500;
const MAX_MEMBERS = 120;
const REQUEST_TIMEOUT_MS = 60_000;

interface ClientLiturgyItem {
  type?: string;
  title?: string;
  details?: string;
  songId?: string;
  responsible?: string;
  duration?: string;
}

interface ClientMember {
  id: string;
  userId?: string;
  name: string;
  skills: string[];
}

interface ClientAssignment {
  memberId?: string;
  userId?: string;
  memberName?: string;
  role: string;
}

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
  songs?: { songId: string }[];
  liturgyItems?: ClientLiturgyItem[];
  assignments?: ClientAssignment[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface EventInfo {
  orgId: string;
  title: string;
  date: string;
  repertoireIds: string[];
}

interface ModeSetup {
  systemPrompt: string;
  catalog: Catalog | null;
  recent: RecentUsage[];
  repertoire: Set<string>;
  members: ClientMember[];
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL;

    if (!apiKey) {
      return json({ error: "Assistente de IA não configurado (OPENROUTER_API_KEY ausente)." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado" }, 401);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const body = await req.json();
    const mode = MODES.includes(body.mode) ? (body.mode as AssistantMode) : null;
    if (!mode) return json({ error: "Modo do assistente inválido." }, 400);

    const clientMessages = parseMessages(body.messages);
    if (!clientMessages.length || clientMessages[clientMessages.length - 1].role !== "user") {
      return json({ error: "Envie ao menos uma mensagem do usuário." }, 400);
    }

    const setup = await setupMode(caller, mode, body);
    const { tools, finalTool } = MODE_TOOLS[mode];

    const messages: LlmMessage[] = [
      { role: "system", content: setup.systemPrompt },
      ...clientMessages
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => toLlmMessage(m, setup)),
    ];

    const usage = { prompt_tokens: 0, completion_tokens: 0 };

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const isLast = iteration === MAX_ITERATIONS - 1;
      const completion = await callOpenRouter(apiKey, {
        model,
        messages,
        tools,
        tool_choice: isLast ? { type: "function", function: { name: finalTool } } : "auto",
        // Só usa provedores que aceitam tools (obrigatório para as propostas estruturadas).
        provider: { require_parameters: true },
        temperature: 0.4,
        max_tokens: 3000,
      });

      usage.prompt_tokens += completion.usage?.prompt_tokens || 0;
      usage.completion_tokens += completion.usage?.completion_tokens || 0;

      const reply = completion.choices?.[0]?.message as LlmMessage | undefined;
      if (!reply) throw new HttpError(502, "Resposta vazia do modelo.");

      const toolCalls = reply.tool_calls || [];
      if (!toolCalls.length) {
        return json({
          message: (reply.content || "").trim() || "Não consegui gerar uma resposta. Tente reformular.",
          model,
          usage,
        });
      }

      const final = toolCalls.find((c) => c.function.name === finalTool);
      if (final) {
        const args = safeParse(final.function.arguments);
        return json({
          message: typeof args.message === "string" ? args.message : "",
          ...buildResult(mode, args, setup),
          model,
          usage,
        });
      }

      messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: toolCalls });
      for (const call of toolCalls) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: runTool(call, setup.catalog),
        });
      }
    }

    throw new HttpError(502, "O assistente não concluiu a resposta. Tente novamente.");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    return json({ error: (e as Error).message || "Erro interno" }, 500);
  }
});

async function loadEvent(sb: SupabaseClient, eventId: string): Promise<EventInfo> {
  if (!eventId) throw new HttpError(400, "Informe o evento.");
  const { data: event, error } = await sb
    .from("events")
    .select("id, org_id, title, service_date")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!event) throw new HttpError(404, "Evento não encontrado ou sem acesso.");

  const { data: rows, error: rowsError } = await sb
    .from("event_songs")
    .select("song_id")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (rowsError) throw rowsError;

  return {
    orgId: event.org_id,
    title: event.title,
    date: event.service_date,
    repertoireIds: (rows || []).map((r: { song_id: string }) => r.song_id),
  };
}

async function setupMode(
  sb: SupabaseClient,
  mode: AssistantMode,
  body: Record<string, any>,
): Promise<ModeSetup> {
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const theme = typeof body.theme === "string" ? body.theme.slice(0, 500) : "";
  const bibleVerse = typeof body.bibleVerse === "string" ? body.bibleVerse.slice(0, 2000) : "";
  const avoidWeeks = clampInt(body.avoidWeeks, 0, 52, mode === "schedule" ? 8 : 6);

  if (mode === "catalog") {
    const catalog = await loadCatalog(sb);
    return {
      systemPrompt: buildCatalogPrompt({ catalog, theme }),
      catalog,
      recent: [],
      repertoire: new Set(),
      members: [],
    };
  }

  if (mode === "playlist") {
    const catalog = await loadCatalog(sb);
    const rawIds: unknown[] = Array.isArray(body.playlist?.songIds) ? body.playlist.songIds.slice(0, 300) : [];
    const current = rawIds
      .map((id) => catalog.byId.get(String(id)))
      .filter((s) => s != null);
    return {
      systemPrompt: buildPlaylistPrompt({
        catalog,
        title: typeof body.playlist?.title === "string" ? sanitize(body.playlist.title.slice(0, 120)) : "",
        theme,
        bibleVerse,
        current: current.map((s) => `${s!.ref}|${songLabel(s!)}|${s!.title}`),
      }),
      catalog,
      recent: [],
      repertoire: new Set(current.map((s) => s!.id)),
      members: [],
    };
  }

  const event = await loadEvent(sb, eventId);
  const ctx = { theme, bibleVerse, eventTitle: event.title, eventDate: event.date };

  if (mode === "schedule") {
    const members = parseMembers(body.team?.members);
    const roles = Array.isArray(body.team?.roles)
      ? body.team.roles.map((r: unknown) => String(r).slice(0, 60)).slice(0, 40)
      : [];
    const history = await loadTeamHistory(sb, {
      orgId: event.orgId,
      weeks: avoidWeeks,
      excludeEventId: eventId,
    });
    const refOf = new Map(members.map((m, i) => [m.id, `m${i + 1}`]));
    const memberLines = members.map((m, i) => {
      const usage = history.get(m.userId || "") ||
        history.get(`name:${m.name.trim().toLowerCase()}`);
      return [
        `m${i + 1}`,
        sanitize(m.name),
        m.skills.map(sanitize).join(", ") || "(sem habilidades cadastradas)",
        usage?.count ?? 0,
        usage?.lastDate ?? "-",
        usage?.declined ?? 0,
      ].join("|");
    });
    const current = parseAssignments(body.team?.assignments).map((a) => {
      const ref = a.memberId ? refOf.get(a.memberId) : undefined;
      return `${a.role}: ${ref ? `${ref} ` : ""}${a.memberName || ""}`.trim();
    });
    return {
      systemPrompt: buildSchedulePrompt({
        ctx,
        historyWeeks: avoidWeeks,
        members: memberLines,
        roles,
        currentAssignments: current,
      }),
      catalog: null,
      recent: [],
      repertoire: new Set(),
      members,
    };
  }

  const catalog = await loadCatalog(sb);
  const recent = await loadRecentUsage(sb, catalog, {
    orgId: event.orgId,
    weeks: avoidWeeks,
    excludeEventId: eventId,
  });
  const repertoire = new Set(event.repertoireIds);

  if (mode === "setlist") {
    return {
      systemPrompt: buildSetlistPrompt({
        catalog,
        recent,
        avoidWeeks,
        ctx,
        repertoire: event.repertoireIds
          .map((id) => catalog.byId.get(id))
          .filter((s) => s != null)
          .map((s) => `${s!.ref}|${songLabel(s!)}|${s!.title}`),
      }),
      catalog,
      recent,
      repertoire,
      members: [],
    };
  }

  const items = parseLiturgyItems(body.liturgy?.items);
  return {
    systemPrompt: buildLiturgyPrompt({
      catalog,
      recent,
      avoidWeeks,
      ctx,
      preacher: typeof body.liturgy?.preacher === "string" ? body.liturgy.preacher : "",
      leader: typeof body.liturgy?.leader === "string" ? body.liturgy.leader : "",
      currentItems: items.map((it, i) => liturgyItemLine(it, i, catalog)),
    }),
    catalog,
    recent,
    repertoire,
    members: [],
  };
}

function liturgyItemLine(it: ClientLiturgyItem, index: number, catalog: Catalog): string {
  const song = it.songId ? catalog.byId.get(it.songId) : undefined;
  return [
    `${index + 1}. [${it.type || "custom"}] ${it.title || ""}`,
    it.details && `— ${it.details}`,
    song && `(música: ${song.ref}|${songLabel(song)}|${song.title})`,
  ].filter(Boolean).join(" ");
}

function buildResult(mode: AssistantMode, args: Record<string, any>, setup: ModeSetup) {
  if (mode === "schedule") {
    return { assignments: validateAssignments(args.assignments, setup.members) };
  }
  if (mode === "liturgy") {
    return { liturgyItems: validateLiturgy(args.items, setup.catalog!) };
  }
  return { songs: validateSongs(args.suggestions, setup.catalog!, setup.recent, setup.repertoire) };
}

function parseMessages(raw: unknown): ClientMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, 4000),
      songs: Array.isArray(m.songs)
        ? m.songs.filter((s: { songId?: unknown }) => typeof s?.songId === "string")
        : undefined,
      liturgyItems: Array.isArray(m.liturgyItems) ? parseLiturgyItems(m.liturgyItems) : undefined,
      assignments: Array.isArray(m.assignments) ? parseAssignments(m.assignments) : undefined,
    }));
}

function parseLiturgyItems(raw: unknown): ClientLiturgyItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).map((it) => ({
    type: typeof it?.type === "string" ? it.type : "custom",
    title: String(it?.title ?? "").slice(0, 200),
    details: typeof it?.details === "string" ? it.details.slice(0, 500) : undefined,
    songId: typeof it?.songId === "string" ? it.songId : undefined,
    responsible: typeof it?.responsible === "string" ? it.responsible.slice(0, 120) : undefined,
    duration: typeof it?.duration === "string" ? it.duration.slice(0, 30) : undefined,
  }));
}

function parseMembers(raw: unknown): ClientMember[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.id === "string" && typeof m.name === "string")
    .slice(0, MAX_MEMBERS)
    .map((m) => ({
      id: m.id,
      userId: typeof m.userId === "string" ? m.userId : undefined,
      name: m.name.slice(0, 120),
      skills: Array.isArray(m.skills) ? m.skills.map((s: unknown) => String(s).slice(0, 60)) : [],
    }));
}

function parseAssignments(raw: unknown): ClientAssignment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a.role === "string")
    .slice(0, 60)
    .map((a) => ({
      memberId: typeof a.memberId === "string" ? a.memberId : undefined,
      userId: typeof a.userId === "string" ? a.userId : undefined,
      memberName: typeof a.memberName === "string" ? a.memberName.slice(0, 120) : undefined,
      role: a.role.slice(0, 60),
    }));
}

/** Reescreve propostas anteriores (UUIDs) com refs, para o modelo entender refinamentos. */
function toLlmMessage(m: ClientMessage, setup: ModeSetup): LlmMessage {
  if (m.role === "user") return { role: "user", content: m.content };

  const parts = [m.content];
  const catalog = setup.catalog;

  if (m.songs?.length && catalog) {
    const list = m.songs
      .map((s, i) => {
        const song = catalog.byId.get(s.songId);
        return song ? `${i + 1}. ${song.ref}|${songLabel(song)}|${song.title}` : null;
      })
      .filter(Boolean)
      .join("\n");
    if (list) parts.push(`Sugestões apresentadas:\n${list}`);
  }

  if (m.liturgyItems?.length && catalog) {
    parts.push(
      `Liturgia proposta:\n${m.liturgyItems.map((it, i) => liturgyItemLine(it, i, catalog)).join("\n")}`,
    );
  }

  if (m.assignments?.length) {
    const refOf = new Map(setup.members.map((mem, i) => [mem.id, `m${i + 1}`]));
    parts.push(
      `Escala proposta:\n${
        m.assignments
          .map((a) => `${a.role}: ${(a.memberId && refOf.get(a.memberId)) || ""} ${a.memberName || ""}`.trim())
          .join("\n")
      }`,
    );
  }

  return { role: "assistant", content: parts.filter(Boolean).join("\n\n") };
}

function runTool(call: ToolCall, catalog: Catalog | null): string {
  if (call.function.name !== "get_song_lyrics" || !catalog) {
    return JSON.stringify({ error: `Ferramenta indisponível: ${call.function.name}` });
  }
  const args = safeParse(call.function.arguments);
  const refs = Array.isArray(args.refs) ? args.refs.map(String).slice(0, MAX_LYRICS_PER_CALL) : [];
  const result = refs.map((ref: string) => {
    const song = catalog.byRef.get(ref);
    if (!song) return { ref, error: "ref inexistente" };
    return {
      ref,
      title: song.title,
      tipo: songLabel(song),
      letra: song.lyrics.slice(0, MAX_LYRICS_CHARS),
    };
  });
  return JSON.stringify(result);
}

function validateSongs(
  raw: unknown,
  catalog: Catalog,
  recent: RecentUsage[],
  repertoire: Set<string>,
) {
  if (!Array.isArray(raw)) return [];
  const lastPlayed = new Map(recent.map((u) => [u.song.id, u.dates[0]]));
  const seen = new Set<string>();
  const out = [];
  for (const item of raw) {
    const song = catalog.byRef.get(String(item?.ref ?? "").trim());
    if (!song || seen.has(song.id)) continue;
    seen.add(song.id);
    out.push({
      songId: song.id,
      title: song.title,
      kind: song.kind,
      number: song.number,
      reason: typeof item.reason === "string" ? item.reason : "",
      lastPlayedAt: lastPlayed.get(song.id) ?? null,
      inRepertoire: repertoire.has(song.id),
    });
  }
  return out;
}

function validateLiturgy(raw: unknown, catalog: Catalog) {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(LITURGY_ITEM_TYPES);
  return raw.slice(0, 40).map((it) => {
    const type = allowed.has(String(it?.type)) ? String(it.type) : "custom";
    const song = type === "hymn" && it?.song_ref ? catalog.byRef.get(String(it.song_ref).trim()) : undefined;
    return {
      type,
      title: String(it?.title ?? "").trim() || (song?.title ?? "Momento"),
      details: typeof it?.details === "string" && it.details.trim() ? it.details.trim() : undefined,
      responsible: typeof it?.responsible === "string" && it.responsible.trim()
        ? it.responsible.trim()
        : undefined,
      duration: typeof it?.duration === "string" && it.duration.trim() ? it.duration.trim() : undefined,
      songId: song?.id,
      songTitle: song?.title,
      songNumber: song?.number ?? null,
      songKind: song?.kind,
    };
  });
}

function validateAssignments(raw: unknown, members: ClientMember[]) {
  if (!Array.isArray(raw)) return [];
  const byRef = new Map(members.map((m, i) => [`m${i + 1}`, m]));
  const seen = new Set<string>();
  const out = [];
  for (const item of raw) {
    const member = byRef.get(String(item?.member_ref ?? "").trim());
    const role = String(item?.role ?? "").trim().slice(0, 60);
    if (!member || !role) continue;
    const key = `${member.id}|${role.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      memberId: member.id,
      userId: member.userId ?? null,
      memberName: member.name,
      role,
      reason: typeof item.reason === "string" ? item.reason : "",
    });
  }
  return out;
}

async function callOpenRouter(apiKey: string, payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "LouvorHub",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new HttpError(502, "Chave do OpenRouter inválida ou desativada (401). Gere uma nova chave.");
      }
      if (res.status === 402) {
        throw new HttpError(402, "Sem créditos no provedor de IA (OpenRouter).");
      }
      if (res.status === 429) {
        throw new HttpError(429, "Muitas requisições ao assistente. Aguarde alguns segundos.");
      }
      if (res.status === 404 && /tool use|tools/i.test(detail)) {
        throw new HttpError(
          502,
          `O modelo configurado não tem provedor com suporte a ferramentas (tool calling). ` +
            `Troque OPENROUTER_MODEL por um que suporte tools (ex.: google/gemma-4-31b-it:free) e rode ` +
            `npx supabase secrets set OPENROUTER_MODEL=...`,
        );
      }
      throw new HttpError(502, `Falha no provedor de IA (${res.status}). ${detail.slice(0, 300)}`);
    }
    return await res.json();
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new HttpError(504, "O assistente demorou demais para responder. Tente novamente.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function sanitize(text: string): string {
  return text.replace(/[|\n\r]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeParse(text: string): Record<string, any> {
  try {
    const parsed = JSON.parse(text || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
