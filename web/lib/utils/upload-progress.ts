/** XHR exposes real transferred-byte progress, unlike fetch. */
export function uploadWithProgress(
  url: string,
  body: XMLHttpRequestBodyInit,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
  method = "POST",
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    request.timeout = 4 * 60 * 60 * 1000; // 4 hours — large videos need far more time
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    request.onerror = () => reject(new Error("Network error. Check your connection and retry."));
    request.ontimeout = () => reject(new Error("Upload timed out. Retry on a stable connection."));
    request.onabort = () => reject(new Error("Upload canceled."));
    request.onload = () => {
      let result: Record<string, unknown> = {};
      try { result = JSON.parse(request.responseText); } catch { /* Non-JSON gateway responses. */ }
      if (request.status < 200 || request.status >= 300) {
        // Carry the numeric status on the Error so the caller can map specific
        // storage codes (413 too-large, 401/403 auth, 404 bucket) to real copy
        // instead of a generic "Network error".
        const detail =
          typeof result.error === "string" ? result.error
          : typeof result.message === "string" ? result.message
          : typeof result.msg === "string" ? result.msg
          : `Upload failed (HTTP ${request.status}). Please retry.`;
        const err = new Error(detail) as Error & { status?: number };
        err.status = request.status;
        reject(err);
      } else resolve(result);
    };
    request.send(body);
  });
}
