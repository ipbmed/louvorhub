import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-113.html', 'utf8');

const toneIdx = h.toLowerCase().indexOf('"tone"');
console.log(h.slice(toneIdx, toneIdx + 80));

const tomIdx = h.toLowerCase().indexOf('tom:');
console.log('tom contexts:');
let from = 0;
for (let n = 0; n < 5; n++) {
  const i = h.toLowerCase().indexOf('tom', from);
  if (i < 0) break;
  console.log(JSON.stringify(h.slice(i, i + 60)));
  from = i + 3;
}

const pre = h.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)[1];
const text = pre
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/?b[^>]*>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\r/g, '');
console.log('---TEXT---');
console.log(text.slice(0, 600));
fs.writeFileSync('tmp/cifra-113-plain.txt', text);
