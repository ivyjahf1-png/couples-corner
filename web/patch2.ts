const fs = require('fs');
const p = 'c:/Users/HomePC/Documents/couples-corner/web/app/(app)/messages/[conversationId]/ChatRoomClient.tsx';
let s = fs.readFileSync(p, 'utf8');
let i = s.indexOf('<form onSubmit={onSubmit} className="flex items-center gap-2">');
if (i < 0) { console.log('FORM NOT FOUND'); process.exit(1); }
s = s.slice(0, i) + '<form onSubmit={onSubmit} className="flex items-center gap-2 chat-composer">' + s.slice(i + '<form onSubmit={onSubmit} className="flex items-center gap-2">'.length);
fs.writeFileSync(p, s, 'utf8');
console.log('FORM patched');
