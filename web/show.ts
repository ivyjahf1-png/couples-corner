const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');
const i = s.search(/ComposerBar/);
if (i < 0) {
  console.log('COMPOSERBAR NOT FOUND');
  process.exit(0);
}
console.log(s.slice(i - 60, i + 200));
