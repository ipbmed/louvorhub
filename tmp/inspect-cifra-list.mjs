import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-list.html', 'utf8');
console.log('len', h.length);
console.log(h.slice(0, 500));
console.log('---');
const idx = h.toLowerCase().indexOf('doxologia');
console.log('doxologia idx', idx);
if (idx >= 0) console.log(h.slice(idx - 200, idx + 200));
const aTags = (h.match(/<a /gi) || []).length;
console.log('a tags', aTags);
const songLike = [...h.matchAll(/href="([^"]*song[^"]*)"/gi)].slice(0, 10);
console.log('song hrefs', songLike.map((m) => m[1]));
const dataJson = h.match(/__NEXT_DATA__|window\.(songs|artist)|"songs"\s*:/i);
console.log('data', dataJson && dataJson[0]);
