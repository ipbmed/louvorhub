import { type Catalog, compactCatalogLines, songLabel } from "./catalog.ts";
import type { RecentUsage } from "./history.ts";

export type AssistantMode = "setlist" | "catalog" | "liturgy" | "schedule";

export const LITURGY_ITEM_TYPES = [
  "hymn",
  "prayer",
  "reading",
  "sermon",
  "offertory",
  "supper",
  "benediction",
  "custom",
] as const;

export interface ServiceContext {
  theme?: string;
  bibleVerse?: string;
  eventTitle?: string;
  eventDate?: string;
}

const ROLE = `Você é um assistente de liturgia de uma igreja presbiteriana (tradição reformada) que ajuda a equipe de louvor e a liderança do culto.`;

const CATALOG_RULES = `- Use SOMENTE músicas do CATÁLOGO, referenciando-as pela coluna "ref" (ex.: s42). Nunca invente músicas.
- Prefira coerência teológica com a fé reformada (soberania de Deus, graça, Cristo como centro).
- Se o início da letra não bastar para avaliar a aderência, use get_song_lyrics (no máximo 8 refs por chamada).`;

function serviceContextLines(ctx: ServiceContext): string {
  return [
    ctx.eventTitle && `Evento: ${ctx.eventTitle}`,
    ctx.eventDate && `Data: ${ctx.eventDate}`,
    `Tema: ${ctx.theme?.trim() || "(não informado)"}`,
    `Texto bíblico: ${ctx.bibleVerse?.trim() || "(não informado)"}`,
  ].filter(Boolean).join("\n");
}

function recentLines(recent: RecentUsage[]): string {
  return recent.length
    ? recent
      .map((u) => `${u.song.ref}|${songLabel(u.song)}|${u.song.title}|${u.dates.join(", ")}`)
      .join("\n")
    : "(nenhuma)";
}

export function buildSetlistPrompt(params: {
  catalog: Catalog;
  recent: RecentUsage[];
  avoidWeeks: number;
  ctx: ServiceContext;
  repertoire: string[];
}): string {
  return `${ROLE}
Sua tarefa: sugerir músicas para o REPERTÓRIO do culto.

# Regras
${CATALOG_RULES}
- Cada sugestão precisa de uma justificativa curta (1-2 frases) ligando a letra ao tema e/ou ao texto bíblico.
- Evite músicas da lista "TOCADAS RECENTEMENTE" (últimas ${params.avoidWeeks} semanas), a menos que o usuário peça.
- Não repita músicas que já estão no REPERTÓRIO ATUAL.
- Quando fizer sentido, equilibre hinos (H + número) e cânticos (C).
- Sem quantidade definida pelo usuário, sugira entre 4 e 6 músicas.
- Sempre finalize chamando suggest_songs. Use "message" para conversar (breve, em português) e "suggestions" para a lista ordenada. Se o usuário só fizer uma pergunta, responda em "message" com "suggestions" vazio.
- Em refinamentos ("troque a 3ª", "algo mais animado"), devolva a lista completa atualizada.

# Contexto do culto
${serviceContextLines(params.ctx)}

# REPERTÓRIO ATUAL
${params.repertoire.length ? params.repertoire.join("\n") : "(vazio)"}

# TOCADAS RECENTEMENTE (ref|tipo|título|datas)
${recentLines(params.recent)}

# CATÁLOGO (ref|tipo|título|tags|início da letra)
${compactCatalogLines(params.catalog)}`;
}

export function buildCatalogPrompt(params: { catalog: Catalog; theme?: string }): string {
  return `${ROLE}
Sua tarefa: ajudar o usuário a ENCONTRAR músicas no catálogo por assunto, tema, texto bíblico, ocasião (Ceia, batismo, Natal, Páscoa...) ou trecho de letra lembrado.

# Regras
${CATALOG_RULES}
- Cada resultado precisa de uma justificativa curta explicando por que combina com o pedido.
- Sem quantidade definida, retorne até 8 músicas, das mais relevantes para as menos.
- Sempre finalize chamando suggest_songs ("message" breve em português + "suggestions" ordenadas). Se não houver nada adequado, diga isso em "message".

${params.theme?.trim() ? `# Assunto informado\n${params.theme.trim()}\n\n` : ""}# CATÁLOGO (ref|tipo|título|tags|início da letra)
${compactCatalogLines(params.catalog)}`;
}

export function buildLiturgyPrompt(params: {
  catalog: Catalog;
  recent: RecentUsage[];
  avoidWeeks: number;
  ctx: ServiceContext;
  preacher?: string;
  leader?: string;
  currentItems: string[];
}): string {
  return `${ROLE}
Sua tarefa: montar ou ajustar a LITURGIA (ordem do culto).

# Estrutura de referência (culto reformado; adapte ao pedido)
Prelúdio · Invocação/Votum · Saudação · Hino de adoração · Leitura da Lei e confissão de pecados · Hino/cântico de confissão · Declaração de perdão · Leitura bíblica · Oração de iluminação · Pregação · Hino de resposta · Dízimos e ofertas · Ceia do Senhor (quando houver) · Bênção apostólica e tríplice amém.

# Regras
${CATALOG_RULES}
- Tipos de momento permitidos (campo "type"): hymn (música), prayer (oração), reading (leitura bíblica), sermon (pregação), offertory (dízimos e ofertas), supper (Ceia), benediction (bênção), custom (outro).
- Momentos do tipo hymn devem indicar "song_ref" do catálogo, escolhida pela relação com o tema, o texto bíblico e o momento (adoração, confissão, resposta, Ceia).
- Em leituras, coloque as referências bíblicas em "details" (ex.: "Salmo 51.1-12"), coerentes com o texto do sermão.
- Use "responsible" apenas quando souber (pregador/dirigente informados).
- "duration" é opcional, em texto curto (ex.: "5 min").
- Evite músicas TOCADAS RECENTEMENTE (últimas ${params.avoidWeeks} semanas), salvo pedido explícito.
- Sempre finalize chamando propose_liturgy com a liturgia COMPLETA na ordem final (não apenas as mudanças). Se o usuário só fizer uma pergunta, responda em "message" com "items" vazio.

# Contexto do culto
${serviceContextLines(params.ctx)}
Pregador: ${params.preacher?.trim() || "(não informado)"}
Dirigente: ${params.leader?.trim() || "(não informado)"}

# LITURGIA ATUAL
${params.currentItems.length ? params.currentItems.join("\n") : "(vazia)"}

# TOCADAS RECENTEMENTE (ref|tipo|título|datas)
${recentLines(params.recent)}

# CATÁLOGO (ref|tipo|título|tags|início da letra)
${compactCatalogLines(params.catalog)}`;
}

export function buildSchedulePrompt(params: {
  ctx: ServiceContext;
  historyWeeks: number;
  members: string[];
  roles: string[];
  currentAssignments: string[];
}): string {
  return `${ROLE}
Sua tarefa: sugerir a ESCALA da equipe de louvor (quem toca/canta em cada função) para o culto.

# Regras
- Escale SOMENTE integrantes da lista INTEGRANTES, referenciando-os pela coluna "ref" (ex.: m3).
- Atribua funções compatíveis com as habilidades do integrante. Só use alguém sem a habilidade se o usuário pedir.
- Distribua a carga: prefira quem participou menos nas últimas ${params.historyWeeks} semanas e evite repetir quem tocou no último culto, quando houver alternativa.
- Considere recusas recentes (declined) como sinal de menor disponibilidade.
- Uma pessoa pode ter mais de uma função apenas se fizer sentido (ex.: Vocal + Violão).
- Sem pedido específico, monte uma equipe básica: Direção de Louvor, Vocal/Back Vocal, Violão ou Teclado, Baixo, Bateria e, se houver pessoas, Sonoplastia/Projeção.
- Cada atribuição tem uma justificativa curta em "reason".
- Sempre finalize chamando propose_team com a escala COMPLETA. Se o usuário só fizer uma pergunta, responda em "message" com "assignments" vazio.

# Contexto do culto
${serviceContextLines(params.ctx)}

# FUNÇÕES USUAIS
${params.roles.join(", ")}

# ESCALA ATUAL
${params.currentAssignments.length ? params.currentAssignments.join("\n") : "(vazia)"}

# INTEGRANTES (ref|nome|habilidades|escalas nas últimas ${params.historyWeeks} semanas|última data|recusas)
${params.members.length ? params.members.join("\n") : "(nenhum integrante no grupo)"}`;
}

const GET_SONG_LYRICS = {
  type: "function",
  function: {
    name: "get_song_lyrics",
    description: "Retorna a letra completa (sem cifras) de até 8 músicas do catálogo.",
    parameters: {
      type: "object",
      properties: {
        refs: {
          type: "array",
          items: { type: "string" },
          description: "Lista de refs do catálogo, ex.: [\"s12\", \"s40\"]",
        },
      },
      required: ["refs"],
    },
  },
};

const SUGGEST_SONGS = {
  type: "function",
  function: {
    name: "suggest_songs",
    description: "Resposta final com a mensagem e a lista ordenada de músicas.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Mensagem curta em português." },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string", description: "ref do catálogo, ex.: s42" },
              reason: { type: "string", description: "Justificativa curta." },
            },
            required: ["ref", "reason"],
          },
        },
      },
      required: ["message", "suggestions"],
    },
  },
};

const PROPOSE_LITURGY = {
  type: "function",
  function: {
    name: "propose_liturgy",
    description: "Resposta final com a mensagem e a liturgia completa na ordem.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Mensagem curta em português." },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: [...LITURGY_ITEM_TYPES] },
              title: { type: "string", description: "Nome do momento." },
              details: { type: "string", description: "Referências bíblicas, orientações." },
              song_ref: { type: "string", description: "ref do catálogo (apenas para type=hymn)." },
              responsible: { type: "string" },
              duration: { type: "string" },
            },
            required: ["type", "title"],
          },
        },
      },
      required: ["message", "items"],
    },
  },
};

const PROPOSE_TEAM = {
  type: "function",
  function: {
    name: "propose_team",
    description: "Resposta final com a mensagem e a escala completa.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Mensagem curta em português." },
        assignments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              member_ref: { type: "string", description: "ref do integrante, ex.: m3" },
              role: { type: "string", description: "Função (ex.: Bateria)." },
              reason: { type: "string", description: "Justificativa curta." },
            },
            required: ["member_ref", "role"],
          },
        },
      },
      required: ["message", "assignments"],
    },
  },
};

export const MODE_TOOLS: Record<AssistantMode, { tools: unknown[]; finalTool: string }> = {
  setlist: { tools: [GET_SONG_LYRICS, SUGGEST_SONGS], finalTool: "suggest_songs" },
  catalog: { tools: [GET_SONG_LYRICS, SUGGEST_SONGS], finalTool: "suggest_songs" },
  liturgy: { tools: [GET_SONG_LYRICS, PROPOSE_LITURGY], finalTool: "propose_liturgy" },
  schedule: { tools: [PROPOSE_TEAM], finalTool: "propose_team" },
};
