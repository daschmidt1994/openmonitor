import { CheckStatus } from "@openmonitor/shared";
import { httpRequest } from "../http-client";
import { statusCodeMatches } from "../status-codes";
import { resolveJsonPath } from "../json-path";
import type { CheckResult, CheckableMonitor, Checker } from "../types";

export const jsonQueryChecker: Checker = {
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

      if (!statusCodeMatches(res.statusCode, monitor.expectedStatusCodes)) {
        return {
          status: CheckStatus.DOWN,
          responseTime: res.responseTimeMs,
          statusCode: res.statusCode,
          message: `Unexpected status code ${res.statusCode}`,
          certExpiresAt: null,
          certDaysRemaining: null,
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(res.body);
      } catch {
        return {
          status: CheckStatus.DOWN,
          responseTime: res.responseTimeMs,
          statusCode: res.statusCode,
          message: "Response body is not valid JSON",
          certExpiresAt: null,
          certDaysRemaining: null,
        };
      }

      if (monitor.jsonPath) {
        const value = resolveJsonPath(parsed, monitor.jsonPath);
        const stringValue = typeof value === "string" ? value : JSON.stringify(value);
        if (monitor.jsonExpectedValue !== undefined && monitor.jsonExpectedValue !== null) {
          if (stringValue !== monitor.jsonExpectedValue) {
            return {
              status: CheckStatus.DOWN,
              responseTime: res.responseTimeMs,
              statusCode: res.statusCode,
              message: `JSON path "${monitor.jsonPath}" was "${stringValue}", expected "${monitor.jsonExpectedValue}"`,
              certExpiresAt: null,
              certDaysRemaining: null,
            };
          }
        } else if (value === undefined) {
          return {
            status: CheckStatus.DOWN,
            responseTime: res.responseTimeMs,
            statusCode: res.statusCode,
            message: `JSON path "${monitor.jsonPath}" not found in response`,
            certExpiresAt: null,
            certDaysRemaining: null,
          };
        }
      }

      return {
        status: CheckStatus.UP,
        responseTime: res.responseTimeMs,
        statusCode: res.statusCode,
        message: null,
        certExpiresAt: null,
        certDaysRemaining: null,
      };
    } catch (err) {
      return {
        status: CheckStatus.DOWN,
        responseTime: null,
        statusCode: null,
        message: err instanceof Error ? err.message : "Unknown error",
        certExpiresAt: null,
        certDaysRemaining: null,
      };
    }
  },
};
