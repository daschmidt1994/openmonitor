import { CheckStatus } from "@openmonitor/shared";
import { httpRequest } from "../http-client";
import { statusCodeMatches } from "../status-codes";
import type { CheckResult, CheckableMonitor, Checker } from "../types";

function certDaysRemaining(validTo?: string): { date: Date | null; days: number | null } {
  if (!validTo) return { date: null, days: null };
  const date = new Date(validTo);
  if (Number.isNaN(date.getTime())) return { date: null, days: null };
  const days = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { date, days };
}

export const httpChecker: Checker = {
  async check(monitor: CheckableMonitor): Promise<CheckResult> {
    try {
      const res = await httpRequest(monitor.target, {
        method: monitor.httpMethod ?? "GET",
        headers: monitor.httpHeaders ?? undefined,
        body: monitor.httpBody ?? undefined,
        timeoutMs: monitor.timeout * 1000,
        followRedirects: monitor.followRedirects ?? true,
        ignoreTlsErrors: monitor.ignoreTlsErrors ?? false,
      });

      const { date: certExpiresAt, days: certDays } = certDaysRemaining(res.peerCertificate?.valid_to);

      const statusOk = statusCodeMatches(res.statusCode, monitor.expectedStatusCodes);
      if (!statusOk) {
        return {
          status: CheckStatus.DOWN,
          responseTime: res.responseTimeMs,
          statusCode: res.statusCode,
          message: `Unexpected status code ${res.statusCode}`,
          certExpiresAt,
          certDaysRemaining: certDays,
        };
      }

      if (monitor.keyword) {
        const found = res.body.includes(monitor.keyword);
        const shouldBeFound = !monitor.keywordInverted;
        if (found !== shouldBeFound) {
          return {
            status: CheckStatus.DOWN,
            responseTime: res.responseTimeMs,
            statusCode: res.statusCode,
            message: monitor.keywordInverted
              ? `Keyword "${monitor.keyword}" was found but should not be present`
              : `Keyword "${monitor.keyword}" not found in response body`,
            certExpiresAt,
            certDaysRemaining: certDays,
          };
        }
      }

      if (monitor.checkSslExpiry && certDays !== null) {
        const threshold = monitor.sslExpiryThresholdDays ?? 14;
        if (certDays <= 0) {
          return {
            status: CheckStatus.DOWN,
            responseTime: res.responseTimeMs,
            statusCode: res.statusCode,
            message: "TLS certificate has expired",
            certExpiresAt,
            certDaysRemaining: certDays,
          };
        }
        if (certDays <= threshold) {
          return {
            status: CheckStatus.UP,
            responseTime: res.responseTimeMs,
            statusCode: res.statusCode,
            message: `Warning: TLS certificate expires in ${certDays} day(s)`,
            certExpiresAt,
            certDaysRemaining: certDays,
          };
        }
      }

      return {
        status: CheckStatus.UP,
        responseTime: res.responseTimeMs,
        statusCode: res.statusCode,
        message: null,
        certExpiresAt,
        certDaysRemaining: certDays,
      };
    } catch (err) {
      return {
        status: CheckStatus.DOWN,
        responseTime: null,
        statusCode: null,
        message: err instanceof Error ? err.message : "Unknown HTTP error",
        certExpiresAt: null,
        certDaysRemaining: null,
      };
    }
  },
};
