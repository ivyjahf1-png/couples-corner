/**
 * Shared WebRTC ICE server configuration.
 *
 * WHY ONE MODULE: `useWebRTCCall` (1-on-1 calls) and `useLiveRoom` (the live
 * broadcast mesh) each build `RTCPeerConnection`s. They previously each held a
 * private copy of a STUN-only list, which is exactly the kind of duplication
 * that drifts: adding TURN to one surface and forgetting the other produces the
 * confusing state where calls connect but broadcasts never do. Both import from
 * here so there is one list to change.
 *
 * WHY TURN IS REQUIRED, NOT JUST NICE: a STUN server only discovers the public
 * mapping of a local ICE candidate — it does not relay media. A peer behind
 * symmetric NAT (two devices on the same mobile carrier, behind a corporate
 * or hotel NAT) can discover candidates that no one else can reach, and the
 * call simply never connects. TURN relays the media through a public server
 * when a direct path is impossible. On a mobile-first dating app this is the
 * common case, not the edge case, which is why the fallback is wired here
 * rather than left as a TODO.
 *
 * WHY ALL FIVE URLS: they are NOT redundant. They are probed in order and the
 * first reachable one wins, and each solves a different network problem:
 *
 *   - `stun:…:80`         - plain STUN, the cheapest and fastest path.
 *   - `turn:…:80`         - TURN over UDP. The normal working path.
 *   - `turn:…:80?transport=tcp`  - UDP is sometimes silently filtered by
 *                           carrier-grade NAT or a public Wi-Fi firewall. TURN
 *                           over TCP on a permitted port slips through.
 *   - `turn:…:443`        - UDP/443 is what a strict corporate firewall
 *                           generally still allows, since it is the same port
 *                           as HTTPS web traffic.
 *   - `turns:…:443?transport=tcp` - TURN over TLS, the last resort. Reaches
 *                           peers that nothing else can, at the cost of a
 *                           connection to the relay that cannot be inspected
 *                           or blocked mid-stream.
 *
 * Dropping any one of them narrows the set of networks where a call connects,
 * and the failure is a silent "it just rings and never answers", not an error
 * the member can act on.
 *
 * CREDENTIALS FROM THE ENVIRONMENT, NOT FROM SOURCE: TURN credentials are
 * effectively a username and password for bandwidth on a paid relay, and this
 * repository is public. `NEXT_PUBLIC_` values are inlined into the client
 * bundle, so anything committed here is readable by anyone who loads the app.
 * Metered issues long-lived static credentials, so the real mitigation is
 * rotating them and keeping the blast radius small — which means keeping them
 * out of git and in the deployment environment.
 *
 * Set these in `.env.local` (or the deployment's environment):
 *
 *   NEXT_PUBLIC_TURN_URL=global.relay.metered.ca
 *   NEXT_PUBLIC_TURN_USERNAME=<metered username>
 *   NEXT_PUBLIC_TURN_CREDENTIAL=<metered credential>
 *
 * See `.env.example` for the full list.
 */

/** The STUN server, which needs no credentials. */
const STUN_URL = "stun:stun.relay.metered.ca:80";

/** Host name only, e.g. "global.relay.metered.ca". */
const TURN_HOST = process.env.NEXT_PUBLIC_TURN_URL?.trim();
const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

/**
 * True when TURN is fully configured.
 *
 * All three values are required. A TURN entry with a URL but no credential is
 * rejected by the browser and the whole list can fail, so it is safer to fall
 * back to STUN-only (which connects on many networks) than to ship a
 * half-configured TURN list that breaks the cases that used to work.
 */
export const isTurnConfigured = Boolean(TURN_HOST && TURN_USERNAME && TURN_CREDENTIAL);

/**
 * The ICE server list handed to every `RTCPeerConnection`.
 *
 * Computed once at module load: `process.env.NEXT_PUBLIC_*` is inlined at
 * build time, so reading it per call would be identical work on every connect
 * and would suggest the values could change at runtime, which they cannot.
 */
export const ICE_SERVERS: RTCIceServer[] = isTurnConfigured
  ? [
      { urls: STUN_URL },
      { urls: `turn:${TURN_HOST}:80`, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
      {
        urls: `turn:${TURN_HOST}:80?transport=tcp`,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      { urls: `turn:${TURN_HOST}:443`, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
      {
        urls: `turns:${TURN_HOST}:443?transport=tcp`,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
    ]
  : [
      { urls: STUN_URL },
      // Google's public STUN as a second chance: a single unreachable STUN
      // server should not be the reason a call cannot connect.
      { urls: "stun:stun.l.google.com:19302" },
    ];

/** The `RTCConfiguration` shared by the call hook and the live-room mesh. */
export const RTC_CONFIG: RTCConfiguration = { iceServers: ICE_SERVERS };
