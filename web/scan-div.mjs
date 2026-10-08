import fs from 'node:fs';
const target = process.argv[2];
const t = fs.readFileSync(target, 'utf8');
const re = /<\/?div\b/g;
let m;
const stack = [];
let line = 0;
let opens = 0;
let closes = 0;
while ((m = re.exec(t)) !== null) {
  line = t.slice(0, m.index).split('\n').length;
  if (m[0].startsWith('</')) {
    closes++;
    if (stack.length === 0) { console.log('UNMATCHED_CLOSE line=' + line); }
    else { stack.pop(); }
  } else {
    const gt = t.indexOf('>', m.index);
    if (gt >= 0 && t[gt - 1] === '/') {
      console.log('SELFCLOSE line=' + line);
    } else {
      opens++;
      stack.push(line);
    }
  }
}
console.log('TOTAL_OPENS=' + opens + ' TOTAL_CLOSES=' + closes);
if (stack.length > 0) {
  console.log('UNCLOSED (innermost last):');
  for (let i = stack.length - 1; i >= 0; i--) {
    console.log('  line=' + stack[i]);
  }
} else {
  console.log('BALANCED: all divs closed');
}
