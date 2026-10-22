const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');
const a = 'prefers-reduced-motion';
let i = s.indexOf(a);
let n = 0;
while (i >= 0 && n < 12) {
  console.log('--- occurrence at ' + i);
  console.log(s.slice(i - 60, i + 450).replace(/\r\n/g, '\n'));
  i = s.indexOf(a, i + 1);
  n++;
}
