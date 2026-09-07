import { writeFileSync, mkdirSync } from 'node:fs';

const url = 'https://www.cifraclub.com.br/ministerio-koinonya-de-louvor/flua/';
const res = await fetch(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
});
const h = await res.text();
mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/koinonya-sample.html', h);

const yt = [...h.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/gi)].map(
  (m) => m[0],
);
const sp = [...h.matchAll(/https?:\/\/open\.spotify\.com\/[^\s"'<>\\]+/gi)].map((m) => m[0]);
console.log('len', h.length);
console.log('yt', [...new Set(yt)].slice(0, 8));
console.log('sp', [...new Set(sp)].slice(0, 8));
const tones = [...h.matchAll(/"tone"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
console.log('tones', [...new Set(tones)].slice(0, 10));
const composers = [...h.matchAll(/Composi[cç][aã]o:\s*([^<\n]+)/gi)].map((m) => m[1].trim());
console.log('composers', composers.slice(0, 5));
const title = h.match(/<h1[^>]*>([^<]+)<\/h1>/i);
console.log('h1', title?.[1]);
