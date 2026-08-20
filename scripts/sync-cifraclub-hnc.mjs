/**
 * Sincroniza letras/tom/links do Hinário Novo Cântico a partir do Cifra Club.
 *
 * Uso:
 *   node scripts/sync-cifraclub-hnc.mjs           # aplica
 *   node scripts/sync-cifraclub-hnc.mjs --dry-run # só relatório
 *   node scripts/sync-cifraclub-hnc.mjs --limit=5
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIST_SLUG = 'hinario-presbiteriano-novo-cantico';
const LIST_URL = `https://www.cifraclub.com.br/${ARTIST_SLUG}/musicas.html?order=alphabetical`;
const BASE = `https://www.cifraclub.com.br/${ARTIST_SLUG}`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL/key');
  process.exit(1);
}
const sb = createClient(url, key);

const CHORD_RE =
  /[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus\d*|add\d*|M|º|°)?\d*(?:\([^)]+\))?(?:\/[A-G](?:#|b)?)?/g;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(target) {
  const res = await fetch(target, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${target}`);
  return res.text();
}

function extractArtistSongs(html) {
  const marker = 'artistSongs\\":[';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('artistSongs payload not found');
  let i = start + 'artistSongs\\":'.length;
  let depth = 0;
  let end = -1;
  for (; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error('artistSongs array incomplete');
  const escaped = html.slice(start + 'artistSongs\\":'.length, end);
  const jsonText = escaped.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return JSON.parse(jsonText);
}

function extractNumber(name) {
  const patterns = [
    /^(\d{1,3})\s*[-–—]/,
    /\bhino\s*n\.?\s*º?\s*(\d{1,3})\b/i,
    /\bhino\s*(\d{1,3})\b/i,
    /\bn\.?\s*º?\s*(\d{1,3})\b/i,
    /\((\d{1,3})\)/,
    /\b(\d{1,3})\b/,
  ];
  for (const re of patterns) {
    const m = name.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 500) return n;
    }
  }
  return null;
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Must contain at least one chord token and almost only chords/spaces
  const withoutChords = trimmed.replace(CHORD_RE, '').replace(/\s+/g, '');
  if (withoutChords.length > 0) return false;
  const tokens = trimmed.match(CHORD_RE) || [];
  return tokens.length > 0;
}

function mergeChordLyric(chordLine, lyricLine) {
  const chords = [];
  let m;
  const re = new RegExp(CHORD_RE.source, 'g');
  while ((m = re.exec(chordLine)) !== null) {
    chords.push({ chord: m[0], index: m.index });
  }
  let lyric = lyricLine;
  // Keep trailing spaces useful for alignment; don't trim
  for (let i = chords.length - 1; i >= 0; i--) {
    const { chord, index } = chords[i];
    const pos = Math.min(Math.max(index, 0), lyric.length);
    lyric = `${lyric.slice(0, pos)}[${chord}]${lyric.slice(pos)}`;
  }
  return lyric.replace(/\s+$/, '');
}

/** Converte cifra monoespaçada (acorde acima) para ChordPro inline. */
function chordChartToChordPro(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (isChordLine(line) && next != null && !isChordLine(next) && next.trim() !== '') {
      out.push(mergeChordLyric(line, next));
      i += 2;
      continue;
    }
    if (isChordLine(line) && (next == null || next.trim() === '')) {
      // orphan chord line — skip or keep as comment
      i += 1;
      continue;
    }
    out.push(line);
    i += 1;
  }
  // Collapse excessive blank lines
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

function extractCifraFromHtml(html) {
  const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!pre) return null;
  return pre[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ');
}

function normalizeKey(tone) {
  if (!tone) return null;
  const t = String(tone).trim();
  if (!t) return null;
  // Cifra Club sometimes uses lowercase
  const m = t.match(/^([A-Ga-g])([#b]?)(m)?/);
  if (!m) return t;
  return `${m[1].toUpperCase()}${m[2] || ''}${m[3] || ''}`;
}

function pickBestByNumber(songs) {
  /** @type {Map<number, any[]>} */
  const map = new Map();
  for (const s of songs) {
    const n = extractNumber(s.name);
    if (n == null) continue;
    if (!map.has(n)) map.set(n, []);
    map.get(n).push(s);
  }
  /** @type {Map<number, any>} */
  const best = new Map();
  for (const [n, list] of map) {
    list.sort((a, b) => (b.hits || 0) - (a.hits || 0));
    best.set(n, list[0]);
  }
  return best;
}

async function main() {
  mkdirSync('tmp', { recursive: true });
  console.log('Baixando lista do Cifra Club...');
  const listHtml = await fetchText(LIST_URL);
  const artistSongs = extractArtistSongs(listHtml);
  writeFileSync('tmp/cifra-songs.json', JSON.stringify(artistSongs, null, 2));
  console.log(`Cifra Club: ${artistSongs.length} músicas listadas`);

  const byNumber = pickBestByNumber(artistSongs);
  console.log(`Com número de hino identificável: ${byNumber.size}`);

  const { data: dbSongs, error } = await sb
    .from('songs')
    .select('id, number, title, musical_key, lyrics_md, hymnals(name)')
    .eq('kind', 'hino')
    .not('number', 'is', null)
    .order('number');
  if (error) throw error;

  const hnc = (dbSongs || []).filter((s) => {
    const name = s.hymnals?.name || '';
    return !name || /novo\s*c[aâ]ntico/i.test(name);
  });
  console.log(`Banco: ${hnc.length} hinos (Novo Cântico / sem hinário)`);

  const report = {
    updated: [],
    skipped: [],
    missingOnCifra: [],
    errors: [],
    keyMismatch: [],
  };

  let processed = 0;
  for (const song of hnc) {
    if (processed >= limit) break;
    const cifra = byNumber.get(song.number);
    if (!cifra) {
      report.missingOnCifra.push({ number: song.number, title: song.title });
      continue;
    }
    processed += 1;
    const pageUrl = `${BASE}/${cifra.slug}/`;
    const tone = normalizeKey(cifra.version?.tone);

    try {
      await sleep(350);
      const html = await fetchText(pageUrl);
      const plain = extractCifraFromHtml(html);
      if (!plain || plain.trim().length < 20) {
        report.errors.push({ number: song.number, url: pageUrl, error: 'cifra vazia' });
        continue;
      }
      const lyrics = chordChartToChordPro(plain);
      if (!lyrics || lyrics.length < 20) {
        report.errors.push({ number: song.number, url: pageUrl, error: 'conversão vazia' });
        continue;
      }

      const keyChanged = tone && song.musical_key && tone !== song.musical_key;
      if (keyChanged) {
        report.keyMismatch.push({
          number: song.number,
          title: song.title,
          db: song.musical_key,
          cifra: tone,
        });
      }

      if (dryRun) {
        report.updated.push({
          number: song.number,
          title: song.title,
          url: pageUrl,
          tone,
          preview: lyrics.slice(0, 120),
        });
        console.log(`[dry-run] #${song.number} ${song.title} → ${pageUrl} (tom ${tone || '—'})`);
        continue;
      }

      const { error: upErr } = await sb
        .from('songs')
        .update({
          lyrics_md: lyrics,
          musical_key: tone || song.musical_key,
          updated_at: new Date().toISOString(),
        })
        .eq('id', song.id);
      if (upErr) throw upErr;

      // Replace/ensure Cifra Club link
      await sb.from('song_links').delete().eq('song_id', song.id).ilike('label', '%cifra%club%');
      const { data: existingLinks } = await sb
        .from('song_links')
        .select('sort_order')
        .eq('song_id', song.id)
        .order('sort_order', { ascending: false })
        .limit(1);
      const sortOrder = (existingLinks?.[0]?.sort_order ?? -1) + 1;
      const { error: linkErr } = await sb.from('song_links').insert({
        song_id: song.id,
        label: 'Cifra Club',
        url: pageUrl,
        sort_order: sortOrder,
      });
      if (linkErr) throw linkErr;

      report.updated.push({
        number: song.number,
        title: song.title,
        url: pageUrl,
        tone,
        keyChanged: Boolean(keyChanged),
      });
      console.log(`OK #${song.number} ${song.title} (tom ${tone || song.musical_key || '—'})`);
    } catch (err) {
      report.errors.push({
        number: song.number,
        title: song.title,
        url: pageUrl,
        error: err.message || String(err),
      });
      console.error(`ERR #${song.number}:`, err.message || err);
    }
  }

  // Cifra songs with number not in DB
  for (const [n, c] of byNumber) {
    if (!hnc.some((s) => s.number === n)) {
      report.skipped.push({ number: n, name: c.name, reason: 'não existe no banco' });
    }
  }

  writeFileSync('tmp/cifra-sync-report.json', JSON.stringify(report, null, 2));
  console.log('\n=== Resumo ===');
  console.log('Atualizados:', report.updated.length);
  console.log('Sem match no Cifra:', report.missingOnCifra.length);
  console.log('No Cifra sem banco:', report.skipped.length);
  console.log('Tom diferente:', report.keyMismatch.length);
  console.log('Erros:', report.errors.length);
  console.log('Relatório: tmp/cifra-sync-report.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
