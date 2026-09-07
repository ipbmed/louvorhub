import { readFileSync } from 'node:fs';

const h = readFileSync('tmp/koinonya-sample.html', 'utf8');
const needles = [
  'youtube',
  'youtu',
  'spotify',
  'tone',
  'Tom',
  '<pre',
  'cifra',
  'composer',
  'composi',
  'videoId',
  'music.youtube',
  'open.spotify',
  'dns.google',
];
for (const n of needles) {
  const idx = h.toLowerCase().indexOf(n.toLowerCase());
  console.log(n, idx, idx >= 0 ? h.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, ' ') : '');
}

// Look for escaped JSON chunks
const m = h.match(/cifra[^"]{0,40}/i);
console.log('cifra sample', m?.[0]);

const preCount = (h.match(/<pre/gi) || []).length;
console.log('pre count', preCount);

// Try finding RSC flight data with lyrics
const chordHint = h.match(/\[Intro\]|Como é|Adoramos|Flua/i);
console.log('lyric hint', chordHint?.[0], chordHint?.index);
