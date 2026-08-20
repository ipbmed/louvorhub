import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-113.html', 'utf8');
const checks = [
  'cifra_cnt',
  'js-cifra',
  'pre',
  'Tom:',
  'tone',
  'chord-lyric',
  '__NEXT_DATA__',
  'cifraBody',
  'lyrics',
];
for (const c of checks) {
  console.log(c, h.indexOf(c));
}
const tom = h.match(/Tom:\s*([A-G][#b]?m?)/i);
console.log('tom match', tom && tom[0]);
const pre = h.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
console.log('pre len', pre && pre[1].length);
if (pre) console.log(pre[1].slice(0, 400));

// next data?
const next = h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
console.log('next', !!next);
if (next) {
  const data = JSON.parse(next[1]);
  fs.writeFileSync('tmp/cifra-113-next.json', JSON.stringify(data, null, 2).slice(0, 50000));
  console.log('keys', Object.keys(data));
}
