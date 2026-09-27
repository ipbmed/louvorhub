/**
 * Sincroniza uma ou mais cifras do Cifra Club.
 * Atualiza se encontrar pelo título; senão insere.
 * Links: Cifra Club + YouTube (clipe da página).
 *
 * Uso:
 *   node scripts/sync-one-cifraclub.mjs <url> [url...]
 *   node scripts/sync-one-cifraclub.mjs --dry-run <url>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const URLS = args.filter((a) => /^https?:\/\//i.test(a));

if (!URLS.length) {
  console.error('Informe ao menos uma URL do Cifra Club.');
  process.exit(1);
}

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
  /[A-G](?:#|b)?(?:maj|min|dim|aug|sus\d*|add\d*|m|M|º|°)?(?:\d+M?|[+#]+)*(?:\([^)]+\))?(?:\/[A-G](?:#|b)?(?:maj|min|dim|aug|sus\d*|add\d*|m|M|º|°)?(?:\d+M?|[+#]+)*)?/g;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeTitle(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tagForUrl(pageUrl) {
  try {
    const parts = new URL(pageUrl).pathname.split('/').filter(Boolean);
    const artist = parts[0] || 'Cifra Club';
    return artist
      .split('-')
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  } catch {
    return 'Cifra Club';
  }
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

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\[.+\]$/.test(trimmed)) return false;
  if (/^(intro|refr[aã]o|p[oó]s|solo|ponte|final|verso|estrofe|bridge)/i.test(trimmed)) {
    return false;
  }
  const withoutChords = trimmed.replace(CHORD_RE, '').replace(/[()\-\/·•.,]/g, '').replace(/\s+/g, '');
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
  // Agrupa acordes na mesma posição (ex.: "A  G  D" no fim da frase)
  const byPos = new Map();
  for (const { chord, index } of chords) {
    const pos = Math.min(Math.max(index, 0), lyricLine.length);
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos).push(chord);
  }
  const positions = [...byPos.keys()].sort((a, b) => b - a);
  let lyric = lyricLine;
  for (const pos of positions) {
    const token = byPos.get(pos).map((c) => `[${c}]`).join('');
    lyric = `${lyric.slice(0, pos)}${token}${lyric.slice(pos)}`;
  }
  return lyric.replace(/\s+$/, '');
}

function stripTabsAndNoise(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const out = [];
  let inTab = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^\[?\s*tab\b/i.test(t) || /^parte\s+\d+/i.test(t) || /^riff\b/i.test(t)) {
      inTab = true;
      continue;
    }
    if (inTab) {
      if (
        /^\[(intro|refr|p[oó]s|ponte|estrofe|verso|solo|final)/i.test(t) ||
        (/[A-Za-zÀ-ÿ]{3,}/.test(t) && !/^[eEbBgGdDaA]\|/.test(t) && !/^[-|0-9hpbr\/\\~x]+$/.test(t))
      ) {
        inTab = false;
      } else {
        continue;
      }
    }
    if (/^[eEbBgGdDaA]\|/.test(t)) continue;
    if (/^[-|0-9hpbr\/\\~x.\s]+$/.test(t) && /[-|]/.test(t)) continue;
    if (/^base\b|^solo\b|^passagem\b/i.test(t) && t.length < 40) continue;
    out.push(line);
  }
  return out.join('\n');
}

function expandInlineSectionHeaders(raw) {
  return raw
    .split('\n')
    .map((line) => {
      const m = line.match(
        /^\s*\[?\s*(Intro(?:dução)?|Refrão(?:\s*Final)?|Pós\s*-?\s*Refrão|Ponte|Verso|Estrofe|Solo|Final(?:ização)?)\s*\]?\s*(.*)$/i,
      );
      if (!m) return line;
      const label = m[1];
      const rest = (m[2] || '').trim();
      if (!rest) return `[${label}]`;
      if (isChordLine(rest) || /^(?:\(?\s*[A-G][#b]?)/.test(rest)) {
        return `[${label}]\n${rest}`;
      }
      return `[${label}]\n${rest}`;
    })
    .join('\n');
}

function cleanNestedChords(text) {
  let prev = '';
  let cur = text;
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(/\[([^\]\[]*)\[([^\]]+)\]([^\]]*)\]/g, '[$1][$2]$3');
  }
  return cur.replace(/\[\]/g, '');
}

function chordChartToChordPro(raw) {
  const cleaned = expandInlineSectionHeaders(stripTabsAndNoise(raw));
  const lines = cleaned.split('\n');
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
    if (isChordLine(line)) {
      const toks = line.match(CHORD_RE) || [];
      if (toks.length) out.push(toks.map((t) => `[${t}]`).join(' '));
      i += 1;
      continue;
    }
    out.push(line);
    i += 1;
  }
  return cleanNestedChords(
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, ''),
  );
}

function mapSections(text) {
  return text
    .replace(/^\s*\[?\s*Intro(?:dução)?\s*\]?\s*$/gim, '[INTRO]')
    .replace(/^\s*\[?\s*Refrão\s*Final\s*\]?\s*$/gim, '[REFRAO]')
    .replace(/^\s*\[?\s*Refrão\s*\]?\s*$/gim, '[REFRAO]')
    .replace(/^\s*\[?\s*Pós\s*-?\s*Refrão\s*\]?\s*$/gim, '[POS_REFRAO]')
    .replace(/^\s*\[?\s*Ponte\s*\]?\s*$/gim, '[PONTE]')
    .replace(/^\s*\[?\s*(?:Verso|Estrofe|Verse|Primeira\s+Parte|Segunda\s+Parte|Terceira\s+Parte|Parte\s*\d*)\s*\]?\s*$/gim, '[ESTROFE]')
    .replace(/^\s*\[?\s*Solo\s*\]?\s*$/gim, '[SOLO]')
    .replace(/^\s*\[?\s*Final(?:ização)?\s*\]?\s*$/gim, '[OUTRO]')
    .replace(/^\s*\(\s*/gm, '')
    .replace(/\s*\)\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractCifraFromHtml(html) {
  const pre =
    html.match(/<pre[^>]*data-chord-content[^>]*>([\s\S]*?)<\/pre>/i) ||
    html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
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

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1?.[1]?.trim()) return decodeHtml(h1[1].trim());
  const og = html.match(/property="og:title"\s+content="([^"]+)"/i);
  if (og?.[1]) {
    return decodeHtml(og[1].replace(/\s*[-|].*$/, '').trim());
  }
  return null;
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractTone(html) {
  const btn = html.match(/data-anchor="--chord-tone"[^>]*>([^<]+)</i);
  if (btn?.[1]?.trim()) return normalizeKey(btn[1].trim());
  const tones = [...html.matchAll(/"tone"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (tones.length) return normalizeKey(tones[0]);
  const tom = html.match(/Tom:\s*([A-Ga-g][#b]?m?)/);
  if (tom) return normalizeKey(tom[1]);
  return null;
}

function normalizeKey(tone) {
  if (!tone) return null;
  const t = String(tone).trim();
  const m = t.match(/^([A-Ga-g])([#b]?)(m)?/);
  if (!m) return t;
  return `${m[1].toUpperCase()}${m[2] || ''}${m[3] || ''}`;
}

function extractComposer(html) {
  const names = [];
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      if (data?.['@type'] === 'MusicComposition' && data.composer) {
        const list = Array.isArray(data.composer) ? data.composer : [data.composer];
        for (const c of list) {
          if (c?.name) names.push(String(c.name).trim());
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (names.length) return [...new Set(names)].join(' / ');
  const plain = html.match(/Composi[cç][aã]o:\s*([^<\n]+)/i);
  return plain?.[1]?.trim() || null;
}

function extractYoutube(html) {
  const ids = [...html.matchAll(/i\.ytimg\.com\/vi(?:_webp)?\/([\w-]{6,})/g)].map((m) => m[1]);
  const unique = [...new Set(ids)].filter((id) => id !== 'cifraclub' && id.length >= 8);
  if (!unique.length) return null;
  return `https://www.youtube.com/watch?v=${unique[0]}`;
}

function titlesMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

async function replaceManagedLinks(songId, managed) {
  await sb.from('song_links').delete().eq('song_id', songId).in('label', ['Cifra Club', 'YouTube', 'Spotify']);
  await sb.from('song_links').delete().eq('song_id', songId).ilike('label', '%cifra%club%');

  const { data: existingLinks } = await sb
    .from('song_links')
    .select('sort_order')
    .eq('song_id', songId)
    .order('sort_order', { ascending: false })
    .limit(1);
  let sortOrder = (existingLinks?.[0]?.sort_order ?? -1) + 1;
  const rows = managed
    .filter((l) => l.url)
    .map((l) => ({
      song_id: songId,
      label: l.label,
      url: l.url,
      sort_order: sortOrder++,
    }));
  if (rows.length) {
    const { error } = await sb.from('song_links').insert(rows);
    if (error) throw error;
  }
}

async function main() {
  mkdirSync('tmp', { recursive: true });
  const report = { updated: [], inserted: [], errors: [], skipped: [] };

  const { data: allSongs, error: listErr } = await sb
    .from('songs')
    .select('id, title, kind, musical_key');
  if (listErr) throw listErr;
  const catalog = allSongs || [];

  for (const pageUrl of URLS) {
    const slug = pageUrl.split('/').filter(Boolean).pop();
    console.log(`\n→ ${slug}`);
    try {
      await sleep(400);
      const html = await fetchText(pageUrl);
      const title = extractTitle(html);
      if (!title) throw new Error('título não encontrado');
      const plain = extractCifraFromHtml(html);
      if (!plain || plain.trim().length < 20) throw new Error('cifra vazia');
      const lyrics = mapSections(chordChartToChordPro(plain));
      if (!lyrics || lyrics.length < 20) throw new Error('conversão vazia');
      const tone = extractTone(html);
      const composition = extractComposer(html);
      const youtubeUrl = extractYoutube(html);
      const tag = tagForUrl(pageUrl);

      writeFileSync(
        `tmp/cifra-${slug}.txt`,
        [
          `# ${title}`,
          `# tom=${tone || '?'}`,
          `# yt=${youtubeUrl || '-'}`,
          `# composition=${composition || '-'}`,
          `# tag=${tag}`,
          '',
          lyrics,
        ].join('\n'),
        'utf8',
      );

      const exact = catalog.find((s) => normalizeTitle(s.title) === normalizeTitle(title));
      const soft = catalog.filter((s) => titlesMatch(s.title, title));
      const match =
        exact || soft.find((s) => s.kind === 'cantico') || soft[0] || null;
      const payload = {
        title,
        kind: 'cantico',
        number: null,
        lyrics_md: lyrics,
        musical_key: tone,
        composition,
        author: composition,
        reviewed: true,
        updated_at: new Date().toISOString(),
        tags: [tag],
      };

      const managedLinks = [
        { label: 'Cifra Club', url: pageUrl },
        youtubeUrl ? { label: 'YouTube', url: youtubeUrl } : null,
      ].filter(Boolean);

      if (dryRun) {
        console.log(
          `[dry-run] ${match ? 'UPDATE' : 'INSERT'} "${title}" tom=${tone || '—'} yt=${Boolean(youtubeUrl)}`,
        );
        (match ? report.updated : report.inserted).push({ title, pageUrl, tone, youtubeUrl });
        continue;
      }

      let songId;
      if (match) {
        const { error: upErr } = await sb.from('songs').update(payload).eq('id', match.id);
        if (upErr) throw upErr;
        songId = match.id;
        report.updated.push({ id: songId, title, pageUrl, tone, youtubeUrl });
        console.log(`  UPDATE ${title} (${songId})`);
      } else {
        const { data: inserted, error: inErr } = await sb
          .from('songs')
          .insert(payload)
          .select('id')
          .single();
        if (inErr) throw inErr;
        songId = inserted.id;
        catalog.push({ id: songId, title, kind: 'cantico', musical_key: tone });
        report.inserted.push({ id: songId, title, pageUrl, tone, youtubeUrl });
        console.log(`  INSERT ${title} (${songId})`);
      }

      await replaceManagedLinks(songId, managedLinks);
      console.log(`  links: cifra${youtubeUrl ? '+yt' : ''}`);
    } catch (err) {
      console.error(`  ERROR: ${(err && err.message) || err}`);
      report.errors.push({ pageUrl, error: String((err && err.message) || err) });
    }
  }

  writeFileSync('tmp/cifra-sync-report.json', JSON.stringify(report, null, 2));
  console.log('\n=== RESUMO ===');
  console.log(`atualizadas: ${report.updated.length}`);
  console.log(`inseridas:   ${report.inserted.length}`);
  console.log(`erros:       ${report.errors.length}`);
  console.log('Relatório: tmp/cifra-sync-report.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
