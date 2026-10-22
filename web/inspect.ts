const fs = require('fs');
const path = process.argv[2];
const s = fs.readFileSync(path, 'utf8');
console.log('--- setKeyboardInset ---');
const i = s.indexOf('setKeyboardInset');
if (i < 0) {
  console.log('NOT FOUND');
} else {
  console.log(s.slice(i - 50, i + 400));
}
console.log('--- root class ---');
const r = s.indexOf('bg-[#0F0C1B]');
if (r < 0) console.log('NOT FOUND');
else console.log(s.slice(r - 80, r + 260));
console.log('--- react imports ---');
console.log(s.slice(0, 300));
