const fs = require('fs');
const p = 'c:/Users/HomePC/Documents/couples-corner/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx';
let s = fs.readFileSync(p, 'utf8');
const a = 'overflow-hidden bg-[#0F0C1B]';
const b = 'overflow-hidden bg-[#0F0C1B] chat-column';
const i = s.indexOf(a);
if (i < 0) {
  console.log('NOT FOUND');
  process.exit(1);
}
s = s.slice(0, i) + b + s.slice(i + a.length);
fs.writeFileSync(p, s, 'utf8');
console.log('replaced');
