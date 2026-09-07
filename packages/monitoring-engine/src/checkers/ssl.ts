import * as tls from "node:tls";
import { CheckStatus } from "@openmonitor/shared";
import type { CheckResult, CheckableMonitor, Checker } from "../types";

export const sslChecker: Checker = {
  check(monitor: CheckableMonitor): Promise<CheckResult> {
    const started = Date.now();
    const port = monitor.port ?? 443;

    return new Promise((resolve) => {
      let settled = false;
      const socket = tls.connect(
        {
          host: monitor.target,
          port,
          servername: monitor.target,
          rejectUnauthorized: !monitor.ignoreTlsErrors,
          timeout: monitor.timeout * 1000,
        },
        () => {
          if (settled) return;
          settled = true;
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || Object.keys(cert).length === 0) {
            resolve({
              status: CheckStatus.DOWN,
              responseTime: Date.now() - started,
              statusCode: null,
              message: "No TLS certificate returned by server",
              certExpiresAt: null,
              certDaysRemaining: null,
            });
            return;
          }

          const certExpiresAt = new Date(cert.valid_to);
          const certDaysRemaining = Math.floor((certExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const threshold = monitor.sslExpiryThresholdDays ?? 14;

          if (certDaysRemaining <= 0) {
            resolve({
              status: CheckStatus.DOWN,
              responseTime: Date.now() - started,
              statusCode: null,
              message: "TLS certificate has expired",
              certExpiresAt,
              certDaysRemaining,
            });
            return;
          }

          resolve({
            status: CheckStatus.UP,
            responseTime: Date.now() - started,
            statusCode: null,
            message:
              certDaysRemaining <= threshold
                ? `Warning: TLS certificate expires in ${certDaysRemaining} day(s)`
                : null,
            certExpiresAt,
            certDaysRemaining,
          });
        }
      );

      socket.once("timeout", () => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({
          status: CheckStatus.DOWN,
          responseTime: null,
          statusCode: null,
          message: `TLS handshake to ${monitor.target}:${port} timed out`,
          certExpiresAt: null,
          certDaysRemaining: null,
        });
      });

      socket.once("error", (err) => {
        if (settled) return;
        settled = true;
        resolve({
          status: CheckStatus.DOWN,
          responseTime: null,
          statusCode: null,
          message: err.message,
          certExpiresAt: null,
          certDaysRemaining: null,
        });
      });
    });
  },
};
