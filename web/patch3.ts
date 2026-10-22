const fs = require('fs');
const p = 'c:/Users/HomePC/Documents/couples-corner/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx';
let s = fs.readFileSync(p, 'utf8');
const a = 'className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border bg-white/[0.06] px-3 py-2 text-base text-white outline-none placeholder:text-[#B8B2D1] focus:border-[#FF7A00] sm:text-sm"';
const b = 'className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border bg-white/[0.06] px-3 py-2 text-base text-white outline-none placeholder:text-[#B8B2D1] focus:border-[#FF7A00] sm:text-sm chat-composer__field"';
const i = s.indexOf(a);
if (i < 0) { console.log('TEXTAREA NOT FOUND'); process.exit(1); }
s = s.slice(0, i) + b + s.slice(i + a.length);
fs.writeFileSync(p, s, 'utf8');
console.log('TEXTAREA patched');
