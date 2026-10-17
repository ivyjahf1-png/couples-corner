import fs from "fs";
const path = "c:/Users/HomePC/Documents/couples-corner/web/lib/server/messaging.ts";
const content = fs.readFileSync(path, "utf-8");
const marker = "/** Send a message into a conversation. */";
const markerIdx = content.indexOf(marker);
console.log("Marker index:", markerIdx);
if (markerIdx !== -1) {
  // Find what comes after the closing of sendMessage
  const afterFn = content.substring(markerIdx, markerIdx + 2000);
  const returnIdx = afterFn.indexOf("return (data as MessageRow | null) ?? null;");
  console.log("Return statement at offset:", returnIdx);
  const afterReturn = afterFn.substring(returnIdx);
  const nextCommentIdx = afterReturn.indexOf("/**");
  console.log("Next /** after return at offset:", returnIdx + nextCommentIdx);
  if (nextCommentIdx !== -1) {
    const nextComment = afterReturn.substring(nextCommentIdx, nextCommentIdx + 100);
    console.log("Next comment:", JSON.stringify(nextComment));
  }
  // Show the last 200 chars of the function
  const endOfFunc = afterFn.indexOf("\n}", afterFn.indexOf("return (data"));
  console.log("End of function at offset:", endOfFunc);
  console.log("Last 300 chars of function:");
  console.log(JSON.stringify(afterFn.substring(Math.max(0, endOfFunc - 300), endOfFunc + 10)));
}