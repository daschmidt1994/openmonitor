import * as https from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { CheckStatus } from "@openmonitor/shared";
import { httpChecker } from "../checkers/http";

/**
 * Regression test for a real bug: on a keep-alive HTTPS connection,
 * `res.socket` can be null by the time the response's "end" event fires
 * (the socket has already been released back to the agent's free pool),
 * which crashed the peer-certificate lookup. The fix captures the
 * certificate as soon as headers arrive, while the socket is still attached.
 * This test performs several sequential requests over the same default
 * keep-alive agent against a local self-signed HTTPS server to reproduce
 * the conditions that triggered it.
 */
describe("httpChecker against a real HTTPS server (SSL expiry + keep-alive)", () => {
  let server: https.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), "openmonitor-ssl-test-"));
    const keyPath = join(dir, "key.pem");
    const certPath = join(dir, "cert.pem");
    execFileSync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "30",
      "-nodes",
      "-subj",
      "/CN=localhost",
    ]);

    server = https.createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("hello over tls");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `https://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns SSL certificate info without crashing across repeated keep-alive requests", async () => {
    for (let i = 0; i < 3; i++) {
      const result = await httpChecker.check({
        type: "HTTP" as any,
        target: baseUrl,
        timeout: 5,
        ignoreTlsErrors: true,
        checkSslExpiry: true,
        sslExpiryThresholdDays: 14,
      });
      expect(result.status).toBe(CheckStatus.UP);
      expect(result.certExpiresAt).not.toBeNull();
      expect(result.certDaysRemaining).toBeGreaterThan(0);
    }
  });
});
