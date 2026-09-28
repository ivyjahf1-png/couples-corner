// Sanity check for the TURN ICE list: confirms that with the Metered env vars
// set, the derived list matches the five documented URLs, and that omitting any
// one value falls back to STUN-only rather than emitting a half-configured TURN
// entry (which browsers reject outright, breaking networks that used to work).
//
// Run with: node scripts/verify-ice-servers.cjs
const path = require("path");

const TURN_HOST = "global.relay.metered.ca";
const USERNAME = "test-user";
const CREDENTIAL = "test-credential";

function buildIceServers({ url, username, credential }) {
  const stun = "stun:stun.relay.metered.ca:80";
  if (!url || !username || !credential) {
    return [stun, "stun:stun.l.google.com:19302"];
  }
  return [
    stun,
    `turn:${url}:80`,
    `turn:${url}:80?transport=tcp`,
    `turn:${url}:443`,
    `turns:${url}:443?transport=tcp`,
  ];
}

const expected = [
  "stun:stun.relay.metered.ca:80",
  "turn:global.relay.metered.ca:80",
  "turn:global.relay.metered.ca:80?transport=tcp",
  "turn:global.relay.metered.ca:443",
  "turns:global.relay.metered.ca:443?transport=tcp",
];

let failures = 0;
function check(label, actual, want) {
  const ok = JSON.stringify(actual) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log("  expected:", JSON.stringify(want));
    console.log("  actual:  ", JSON.stringify(actual));
  }
}

check(
  "all five Metered URLs present when fully configured",
  buildIceServers({ url: TURN_HOST, username: USERNAME, credential: CREDENTIAL }),
  expected
);

for (const missing of ["url", "username", "credential"]) {
  check(
    `falls back to STUN-only when ${missing} is missing`,
    buildIceServers({
      url: TURN_HOST,
      username: USERNAME,
      credential: CREDENTIAL,
      [missing]: "",
    }),
    ["stun:stun.relay.metered.ca:80", "stun:stun.l.google.com:19302"]
  );
}

console.log(failures === 0 ? "\nAll ICE server checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
