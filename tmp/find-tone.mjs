import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-113.html', 'utf8');
const idx = h.indexOf('Achei um bom amigo');
console.log('lyric idx', idx);

// find tone near song meta
const patterns = [
  /"tone":"([^"]+)"/g,
  /tone\\":\\"([^\\]+)\\"/g,
  /data-tone="([^"]+)"/g,
  /Tom<\/[^>]+>\s*<[^>]+>([^<]+)/gi,
];
for (const p of patterns) {
  const matches = [...h.matchAll(p)].slice(0, 5).map((m) => m[0]);
  console.log(p, matches);
}

// Look for song object
const songObjIdx = h.indexOf('"song"');
console.log('song idx', songObjIdx, h.slice(songObjIdx, songObjIdx + 200));
