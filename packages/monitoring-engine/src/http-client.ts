import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import type { PeerCertificate } from "node:tls";

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs: number;
  followRedirects?: boolean;
  ignoreTlsErrors?: boolean;
  maxRedirects?: number;
}

export interface HttpResponseResult {
  statusCode: number;
  body: string;
  responseTimeMs: number;
  peerCertificate: PeerCertificate | null;
  finalUrl: string;
}

/**
 * Performs a single HTTP(S) request without relying on the global fetch,
 * so we can (a) capture the TLS peer certificate for SSL expiry checks in
 * the same round trip, (b) enforce a hard socket-level timeout, and
 * (c) control redirect following precisely.
 */
export function httpRequest(
  targetUrl: string,
  options: HttpRequestOptions
): Promise<HttpResponseResult> {
  const maxRedirects = options.maxRedirects ?? 5;

  return new Promise((resolve, reject) => {
    const started = Date.now();

    function doRequest(currentUrl: string, redirectsLeft: number) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        reject(new Error(`Invalid URL: ${currentUrl}`));
        return;
      }

      const isHttps = parsed.protocol === "https:";
      const transport = isHttps ? https : http;

      const req = transport.request(
        parsed,
        {
          method: options.method ?? "GET",
          headers: options.headers,
          timeout: options.timeoutMs,
          rejectUnauthorized: isHttps ? !options.ignoreTlsErrors : undefined,
        },
        (res) => {
          // Capture the TLS peer certificate as soon as headers arrive, while
          // the socket is still guaranteed to be attached to the response --
          // on keep-alive connections res.socket can become null by the time
          // the "end" event fires (the socket is released back to the pool).
          const socket = res.socket as unknown as { getPeerCertificate?: () => PeerCertificate } | null;
          const peerCertificate =
            isHttps && socket && typeof socket.getPeerCertificate === "function" ? socket.getPeerCertificate() : null;

          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const statusCode = res.statusCode ?? 0;
            const isRedirect = statusCode >= 300 && statusCode < 400 && res.headers.location;

            if (isRedirect && options.followRedirects && redirectsLeft > 0) {
              const nextUrl = new URL(res.headers.location as string, parsed).toString();
              res.resume();
              doRequest(nextUrl, redirectsLeft - 1);
              return;
            }

            resolve({
              statusCode,
              body: Buffer.concat(chunks).toString("utf-8").slice(0, 1_000_000),
              responseTimeMs: Date.now() - started,
              peerCertificate: peerCertificate && Object.keys(peerCertificate).length > 0 ? peerCertificate : null,
              finalUrl: currentUrl,
            });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error(`Request timed out after ${options.timeoutMs}ms`));
      });

      req.on("error", (err) => reject(err));

      if (options.body) req.write(options.body);
      req.end();
    }

    doRequest(targetUrl, maxRedirects);
  });
}
