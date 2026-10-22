const fs = require('fs');
const p = process.argv[2];
const s = fs.readFileSync(p, 'utf8');
function show(a, extra) {
  const i = s.search(a);
  console.log('=== ' + a.source + ' ===');
  if (i < 0) { console.log('NOT FOUND'); return; }
  console.log(s.slice(i - 100, i + (extra || 600)).replace(/\r\n/g, '\n'));
}
show(/<form onSubmit/);
show(/chat-composer__field/);
show(/chat-column"/);
