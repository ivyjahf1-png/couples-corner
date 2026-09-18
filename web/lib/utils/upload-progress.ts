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
    request.timeout = 30 * 60 * 1000;
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
        reject(new Error(typeof result.error === "string" ? result.error
          : typeof result.message === "string" ? result.message
          : `Upload failed (HTTP ${request.status}). Please retry.`));
      } else resolve(result);
    };
    request.send(body);
  });
}
