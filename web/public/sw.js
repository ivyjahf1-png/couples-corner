/**
 * Couple's Corner — offline video cache.
 *
 * WHY A SERVICE WORKER IS REQUIRED, NOT OPTIONAL: a <video> element can only be
 * fed from a Cache Storage entry by a service worker. `caches` is not reachable
 * from page JavaScript on the media load path, so prefetching into a cache is
 * pointless on its own — the bytes would sit there and the player would still go
 * to the network. This file is the half that actually makes playback offline.
 *
 * WHAT IT DOES
 *   • Stores whole video files in Cache Storage (`CACHE_NAME`).
 *   • Keeps a metadata record per file in IndexedDB (`DB_NAME`) so eviction can
 *     be true LRU. Cache Storage has no access-time concept — `cache.keys()`
 *     returns insertion order, not usage order — so the ordering has to be
 *     tracked somewhere. Only metadata lives in IndexedDB; the bytes stay in
 *     Cache Storage where the fetch handler can read them.
 *   • Enforces a byte budget with least-recently-USED eviction.
 *   • Serves Range requests out of the cache, because a <video> element issues
 *     them for seeking. Serving a 200 to a Range request breaks playback on
 *     Safari, so this slices properly and answers 206.
 *
 * SCOPING — why this only ever touches video:
 *   The fetch handler matches on a media extension in the PATH (query strings
 *   are ignored, because Supabase signed URLs carry a token that changes on
 *   every re-sign and would otherwise blow the cache up with duplicate keys).
 *   Nothing else — no navigation, no API call, no image, no third-party embed —
 *   can match. Cache keys are `origin + pathname` for the same reason.
 *
 * STORING IS PUSH-DRIVEN, NOT AUTOMATIC:
 *   The fetch handler serves from cache and otherwise passes straight through to
 *   the network WITHOUT storing. If it stored on sight, every video a member
 *   merely glanced past would occupy the budget and evict the ones they
 *   actually want offline. Bytes only enter the cache via an explicit PREFETCH
 *   message, so what is on the device is exactly what was asked for and the
 *   budget stays predictable.
 */

const VERSION = "v1";
const CACHE_NAME = `cc-video-${VERSION}`;
const DB_NAME = `cc-video-meta-${VERSION}`;
const DB_STORE = "entries";

/** Hard ceiling on the cache. Five 30s clips is ~15MB; 150MB covers a long
 *  session without ever approaching a phone's storage limits. */
const DEFAULT_BUDGET_BYTES = 150 * 1024 * 1024;

/** Never cache a single file larger than this. One 400MB upload would evict
 *  the entire cache on its own, which is the failure mode the budget is there
 *  to prevent. */
const MAX_ITEM_BYTES = 40 * 1024 * 1024;

const FETCH_TIMEOUT_MS = 30000;

/** Two at a time. Reading a Response into an ArrayBuffer is memory-hungry, and
 *  a phone prefetching six videos at once will be killed for it. */
const PREFETCH_CONCURRENCY = 2;

/** Most items one PREFETCH message may request. The client already limits this
 *  to the next 5; this is the backstop against a malformed message. */
const MAX_BATCH = 20;

let budgetBytes = DEFAULT_BUDGET_BYTES;

const VIDEO_PATH = /\.(mp4|m4v|webm|mov)$/i;

/** Cache key: origin + path, never the query string. */
function cacheKey(url) {
  return `${url.origin}${url.pathname}`;
}

function toUrl(input) {
  try {
    return new URL(input, self.location.origin);
  } catch {
    return null;
  }
}

function isVideoPath(url) {
  return VIDEO_PATH.test(url.pathname);
}

/* ── IndexedDB metadata (the LRU bookkeeping) ─────────────────────────────── */

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("metadata db blocked"));
  });
}

/** Run `fn` in one transaction and resolve with its request's result. */
function withStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, mode);
        let req;
        try {
          req = fn(tx.objectStore(DB_STORE));
        } catch (err) {
          reject(err);
          return;
        }
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

const metaAll = () => withStore("readonly", (s) => s.getAll());
const metaGet = (url) => withStore("readonly", (s) => s.get(url));
const metaPut = (rec) => withStore("readwrite", (s) => s.put(rec));
const metaDelete = (url) => withStore("readwrite", (s) => s.delete(url));

/** Bump an entry's recency so LRU reflects what was actually watched. */
async function touch(url) {
  const rec = await metaGet(url);
  if (!rec) return;
  rec.lastAccessed = Date.now();
  await metaPut(rec);
}

/**
 * Evict least-recently-USED entries until the cache fits the budget.
 * Returns the number of bytes freed.
 */
async function evictToBudget() {
  const cache = await caches.open(CACHE_NAME);
  const entries = await metaAll().catch(() => []);
  let used = entries.reduce((n, e) => n + (e.bytes || 0), 0);
  if (used <= budgetBytes) return 0;

  // Oldest access first. Ties fall back to cache time so ordering is stable
  // and deterministic rather than dependent on IndexedDB's return order.
  entries.sort(
    (a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0) || (a.cachedAt || 0) - (b.cachedAt || 0)
  );

  let freed = 0;
  for (const entry of entries) {
    if (used <= budgetBytes) break;
    await cache.delete(entry.url);
    await metaDelete(entry.url);
    const size = entry.bytes || 0;
    used -= size;
    freed += size;
  }
  return freed;
}
/* ── Prefetch ─────────────────────────────────────────────────────────────── */

/**
 * Download one video into the cache.
 *
 * `mode: "cors"` is deliberate. A cross-origin video fetched as `no-cors`
 * yields an OPAQUE response, whose body cannot be read — so its size is
 * unknowable and the LRU budget could not be enforced. A readable response is
 * the whole point of budgeting by bytes.
 */
async function prefetchItem(rawUrl) {
  const url = toUrl(rawUrl);
  if (!url || !isVideoPath(url)) return "skipped";
  const key = cacheKey(url);

  const cache = await caches.open(CACHE_NAME);
  const already = await cache.match(key);
  if (already) {
    // Present but cold: refresh its recency so it is not the next eviction.
    await touch(key);
    return "present";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.href, {
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!res || !res.ok) return "failed";

    // Check the advertised length before reading the body, so an oversized file
    // is rejected without ever being pulled into memory.
    const declared = Number(res.headers.get("content-length") || "0");
    if (declared && declared > MAX_ITEM_BYTES) return "too-large";

    const body = await res.arrayBuffer();
    const bytes = body.byteLength;
    if (bytes > MAX_ITEM_BYTES) return "too-large";

    // Stored as a 200 with a full body. Range requests are reconstructed on
    // read (see `sliceForRange`) rather than by storing partial responses,
    // because a cached partial response is not enough to answer an arbitrary
    // later range.
    await cache.put(
      key,
      new Response(body, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("content-type") || "video/mp4",
          "Content-Length": String(bytes),
          "Accept-Ranges": "bytes",
        },
      })
    );

    const now = Date.now();
    await metaPut({ url: key, bytes, cachedAt: now, lastAccessed: now });
    await evictToBudget();
    return "cached";
  } catch {
    // A failed prefetch is a no-op, never a thrown error: the feed must render
    // identically whether or not any of this worked.
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

async function runPrefetch(items) {
  const results = [];
  let cursor = 0;
  const next = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      const url = typeof item === "string" ? item : item && item.url;
      const id = typeof item === "string" ? undefined : item && item.momentId;
      const status = await prefetchItem(url);
      results.push({ momentId: id, url, status });
    }
  };
  const workers = Array.from(
    { length: Math.min(PREFETCH_CONCURRENCY, Math.max(items.length, 1)) },
    () => next()
  );
  await Promise.all(workers);
  return results;
}

/* ── Reading from the cache ───────────────────────────────────────────────── */

/**
 * Answer a Range request from a fully-cached body.
 *
 * A <video> element issues `Range: bytes=N-` for seeking. Handing it a plain
 * 200 to a Range request is a real failure on Safari and a stall on Chrome, so
 * the cached bytes are sliced and answered as a genuine 206 with a
 * `Content-Range` header. This is why the whole file is cached rather than the
 * first chunk.
 */
async function sliceForRange(cached, rangeHeader) {
  const buffer = await cached.arrayBuffer();
  const total = buffer.byteLength;

  const match = /^bytes=(\d*)-(\d*)$/.exec((rangeHeader || "").trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start;
  let end;

  if (rawStart === "") {
    // Suffix form: `bytes=-500` means the LAST 500 bytes.
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? total - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }
  end = Math.min(end, total - 1);

  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "video/mp4",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
    },
  });
}

/* ── Fetch interception ───────────────────────────────────────────────────── */

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = toUrl(request.url);
  if (!url || !isVideoPath(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const key = cacheKey(url);
      const cached = await cache.match(key);

      if (cached) {
        void touch(key);
        const range = request.headers.get("range");
        if (range) {
          const sliced = await sliceForRange(cached, range);
          if (sliced) return sliced;
        }
        return cached;
      }

      // Not cached. Pass straight through WITHOUT storing — see the header note.
      try {
        return await fetch(request);
      } catch {
        return new Response("", { status: 504, statusText: "Offline and not cached" });
      }
    })()
  );
});
/* ── Messages from the page ───────────────────────────────────────────────── */

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  const reply = (payload) => {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage(payload);
  };

  if (data.type === "PUSH") {
    // A notification raised by the PAGE, via `lib/utils/notify.ts`.
    //
    // This is the only path that can fire today: the browser will not deliver a
    // real push event until VAPID keys, a subscription table and a push server
    // exist (see the note above the `push` listener). Routing it through the same
    // `showNotification` call the push handler uses means one place decides
    // presentation and tap routing, rather than two that drift apart.
    event.waitUntil(
      self.registration
        .showNotification(data.title || "New activity", {
          body: data.body || "",
          // Per-conversation tag, so a busy thread REPLACES its notification
          // instead of stacking a wall of them the member clears unread.
          tag: data.tag || undefined,
          icon: "/icon.png",
          badge: "/apple-icon.png",
          data: { url: data.url || "/" },
          requireInteraction: Boolean(data.requireInteraction),
        })
        // Permission may have been revoked in settings between the page's check
        // and here. Swallowing keeps that from surfacing as a console error the
        // member cannot act on from the page that triggered it.
        .catch(() => undefined),
    );
    return;
  }

  if (data.type === "PREFETCH") {
    const items = Array.isArray(data.items) ? data.items.slice(0, MAX_BATCH) : [];
    event.waitUntil(
      runPrefetch(items)
        .then((results) => reply({ type: "PREFETCH_DONE", results }))
        .catch(() => reply({ type: "PREFETCH_DONE", results: [] }))
    );
    return;
  }

  if (data.type === "SET_BUDGET") {
    const next = Number(data.bytes);
    if (Number.isFinite(next) && next > 0) {
      budgetBytes = next;
      event.waitUntil(evictToBudget());
    }
    return;
  }

  if (data.type === "CLEAR") {
    // Wipes BOTH stores. Clearing only Cache Storage would leave metadata rows
    // behind, and the next eviction pass would then try to delete cache entries
    // that no longer exist while the budget still counted their bytes — the
    // cache would appear permanently full. This is also what the existing
    // Settings "Clear cache" button should call.
    event.waitUntil(
      (async () => {
        await caches.delete(CACHE_NAME);
        await new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(DB_NAME);
          req.onsuccess = resolve;
          req.onerror = resolve;
          req.onblocked = resolve;
        });
        reply({ type: "CLEARED" });
      })()
    );
    return;
  }

  if (data.type === "STATS") {
    event.waitUntil(
      (async () => {
        const entries = await metaAll().catch(() => []);
        reply({
          type: "STATS",
          itemCount: entries.length,
          bytes: entries.reduce((n, e) => n + (e.bytes || 0), 0),
          budgetBytes,
        });
      })()
    );
  }
});

/* ── Lifecycle ────────────────────────────────────────────────────────────── */

self.addEventListener("install", () => {
  // Nothing to precache: the cache is filled exclusively by explicit PREFETCH
  // messages, so an install-time precache would contradict the budget policy.
  self.skipWaiting();
});

/* ── PUSH ────────────────────────────────────────────────────────────────────
 *
 * ── WHAT IS ACTUALLY POSSIBLE HERE, AND WHAT IS NOT ──────────────────────────
 * This handler makes the plumbing real: with a `push` listener and a
 * `notificationclick` handler, a push message from ANY source (Web Push, or a
 * `postMessage` from the page) is turned into a system notification that focuses
 * the right route when tapped.
 *
 * It does NOT, by itself, deliver anything. Three pieces of infrastructure are
 * still missing and none of them can be faked from a static file:
 *
 *   1. VAPID keys. A public key is required to subscribe at all.
 *   2. A `push_subscriptions` table (endpoint + p256dh + auth) to store them.
 *   3. A push SERVER — something that holds the private key and POSTs to each
 *      endpoint. That runs off-request; in this codebase it belongs on
 *      `api/cron/*`, which already has the pattern.
 *
 * Until those exist the browser will never deliver a push event here, so
 * `showNotification` below is reachable only by `postMessage` from the page —
 * which is still useful, and is what `lib/utils/notify.ts` uses for a message
 * that arrives while the tab is backgrounded.
 *
 * ── WHAT A WEB PAGE CAN NEVER DO ─────────────────────────────────────────────
 * It cannot draw over other apps, and it cannot force a heads-up alert. The OS
 * decides presentation, and a member who has silenced this app's notifications
 * has silenced them. "Alert that pops on top of the screen" is a native-app
 * capability; the closest honest web equivalent is a system notification the
 * member controls. Treat any claim otherwise as unimplemented.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // A malformed body must not throw inside the handler: doing so silently
    // drops the notification entirely, which is worse than showing a generic
    // one. Non-JSON payloads are legitimate.
    payload = { title: "New activity", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "New activity";
  const options = {
    body: payload.body || "",
    // `tag` COLLAPSES repeats. Every message from the same conversation would
    // otherwise stack into a wall of 40 notifications, and the member clears the
    // lot without reading any of it. The tag is per-conversation, so the newest
    // replaces the oldest for that thread and the badge count carries the rest.
    tag: payload.tag || undefined,
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/apple-icon.png",
    // Route opened on tap. Read as a path and validated to be same-origin
    // relative, because `notificationclick` does `clients.openWindow(url)` on
    // whatever it is handed.
    data: { url: payload.url || "/" },
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    vibrate: payload.vibrate || undefined,
  };

  // `showNotification` rejects when permission was never granted or was revoked
  // in settings. Swallowing that is deliberate: an unhandled rejection here
  // surfaces as a console error on every single push, and the member cannot act
  // on it from the page that triggered it.
  event.waitUntil(self.registration.showNotification(title, options).catch(() => undefined));
});

/* ── NOTIFICATION CLICK ──────────────────────────────────────────────────────
 *
 * Focus an existing tab on the target route if there is one, otherwise open a
 * new one. Opening a second copy of a tab the member already has is the classic
 * bug here: they tap a message notification, land in a chat, then find their
 * original session still open behind it.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data && event.notification.data.url;
  // Same-origin, path-only. An absolute URL here would let a push payload
  // navigate the member anywhere.
  const safeUrl =
    typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
      ? target
      : "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        // Same-origin AND already on the route: focus rather than navigate, so a
        // half-finished form on that page is not silently replaced.
        if (client.url.includes(safeUrl) && "focus" in client) return client.focus();
      }
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) return client.navigate(safeUrl).then((c) => c && c.focus());
          return client.focus();
        }
      }
      return self.clients.openWindow(safeUrl);
    })(),
  );
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions. Without this a deploy that changes
      // VERSION strands the previous cache on disk forever, since nothing else
      // ever deletes it.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("cc-video-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
      // A returning member is over budget from a previous session.
      await evictToBudget();
    })()
  );
});