import * as net from "node:net";
import { CheckStatus } from "@openmonitor/shared";
import type { CheckResult, CheckableMonitor, Checker } from "../types";

export const tcpChecker: Checker = {
  check(monitor: CheckableMonitor): Promise<CheckResult> {
    return new Promise((resolve) => {
      if (!monitor.port) {
        resolve({
          status: CheckStatus.DOWN,
          responseTime: null,
          statusCode: null,
          message: "No port configured for TCP monitor",
          certExpiresAt: null,
          certDaysRemaining: null,
        });
        return;
      }

      const started = Date.now();
      const socket = new net.Socket();
      let settled = false;

      const finish = (result: CheckResult) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(monitor.timeout * 1000);

      socket.once("connect", () => {
        finish({
          status: CheckStatus.UP,
          responseTime: Date.now() - started,
          statusCode: null,
          message: null,
          certExpiresAt: null,
          certDaysRemaining: null,
        });
      });

      socket.once("timeout", () => {
        finish({
          status: CheckStatus.DOWN,
          responseTime: null,
          statusCode: null,
          message: `Connection to ${monitor.target}:${monitor.port} timed out`,
          certExpiresAt: null,
          certDaysRemaining: null,
        });
      });

      socket.once("error", (err) => {
        finish({
          status: CheckStatus.DOWN,
          responseTime: null,
          statusCode: null,
          message: err.message,
          certExpiresAt: null,
          certDaysRemaining: null,
        });
      });

      socket.connect(monitor.port, monitor.target);
    });
  },
};
