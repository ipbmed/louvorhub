import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-list.html', 'utf8');
const links = [...h.matchAll(/href="(\/hinario-presbiteriano-novo-cantico\/[^"]+)"/g)].map((m) => m[1]);
const uniq = [...new Set(links)].filter(
  (l) => !l.includes('musicas') && !l.endsWith('/') && !l.includes('#'),
);
console.log('count', uniq.length);
console.log(uniq.slice(0, 25).join('\n'));

const sampleSong = uniq.find((l) => l.includes('113')) || uniq[0];
console.log('sample', sampleSong);

// look for JSON blobs
const jsonHints = [...h.matchAll(/https?:\/\/[^"']+api[^"']+/gi)].slice(0, 10).map((m) => m[0]);
console.log('api urls', jsonHints);
