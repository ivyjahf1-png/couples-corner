const fs=require("fs");
for (const f of ["app/favicon.ico","../web-admin/app/favicon.ico"]) {
  const b=fs.readFileSync(f);
  const type=b.readUInt16LE(2), n=b.readUInt16LE(4);
  const sizes=[];
  for (let i=0;i<n;i++){ const o=6+i*16; const w=b.readUInt8(o)||256; const h=b.readUInt8(o+1)||256; const bits=b.readUInt16LE(o+6); const len=b.readUInt32LE(o+8); const off=b.readUInt32LE(o+12);
    const isPng = b.slice(off,off+8).toString("hex")==="89504e470d0a1a0a";
    sizes.push(`${w}x${h}/${bits}bpp/${len}B/png=${isPng}/inBounds=${off+len<=b.length}`); }
  console.log(f, "| bytes="+b.length, "| type="+type, "| count="+n, "|", sizes.join("  "));
}
