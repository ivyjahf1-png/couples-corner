const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');
console.log(s.slice(s.length - 4200, s.length).replace(/\r\n/g, '\n'));
