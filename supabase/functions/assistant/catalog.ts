import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface CatalogSong {
  ref: string;
  id: string;
  kind: "hino" | "cantico";
  number: number | null;
  title: string;
  tags: string[];
  lyrics: string;
}

export interface Catalog {
  songs: CatalogSong[];
  byRef: Map<string, CatalogSong>;
  byId: Map<string, CatalogSong>;
}

const PAGE_SIZE = 1000;
const SNIPPET_CHARS = 120;

/** Remove cifras `[C]`, marcadores `[REFRAO]` e comentários `###`, mantendo só o texto cantado. */
export function plainLyrics(lyricsMd: string): string {
  return (lyricsMd || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("###"))
    .map((line) => line.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function sanitizeField(text: string): string {
  return text.replace(/[|\n\r]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function loadCatalog(sb: SupabaseClient): Promise<Catalog> {
  const rows: {
    id: string;
    kind: "hino" | "cantico";
    number: number | null;
    title: string;
    tags: string[] | null;
    lyrics_md: string | null;
  }[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from("songs")
      .select("id, kind, number, title, tags, lyrics_md")
      .order("number", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const songs: CatalogSong[] = rows.map((row, i) => ({
    ref: `s${i + 1}`,
    id: row.id,
    kind: row.kind,
    number: row.number,
    title: row.title,
    tags: row.tags || [],
    lyrics: plainLyrics(row.lyrics_md || ""),
  }));

  return {
    songs,
    byRef: new Map(songs.map((s) => [s.ref, s])),
    byId: new Map(songs.map((s) => [s.id, s])),
  };
}

export function songLabel(song: CatalogSong): string {
  return song.kind === "hino" && song.number != null ? `H${song.number}` : "C";
}

/** Uma linha por música: `ref|H123 ou C|Título|tags|início da letra`. */
export function compactCatalogLines(catalog: Catalog): string {
  return catalog.songs
    .map((s) => {
      const snippet = sanitizeField(s.lyrics).slice(0, SNIPPET_CHARS);
      const tags = s.tags.map(sanitizeField).filter(Boolean).join(", ");
      return [s.ref, songLabel(s), sanitizeField(s.title), tags, snippet].join("|");
    })
    .join("\n");
}
