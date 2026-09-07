import { execFile } from "node:child_process";
import { CheckStatus } from "@openmonitor/shared";
import type { CheckResult, CheckableMonitor, Checker } from "../types";

/**
 * Shells out to the system `ping` binary rather than crafting raw ICMP
 * sockets in Node. Raw ICMP sockets require CAP_NET_RAW (or root), which the
 * `ping` binary already handles via its own capabilities/setuid bit -- this
 * keeps the worker container's privilege footprint minimal and predictable.
 * The worker Docker image installs iputils-ping and grants CAP_NET_RAW
 * (see infra/docker/worker.Dockerfile and docker-compose.yml).
 */
export const pingChecker: Checker = {
  check(monitor: CheckableMonitor): Promise<CheckResult> {
    const timeoutSec = Math.max(1, Math.ceil(monitor.timeout));
    const started = Date.now();

    return new Promise((resolve) => {
      execFile(
        "ping",
        ["-c", "1", "-W", String(timeoutSec), monitor.target],
        { timeout: (timeoutSec + 2) * 1000 },
        (error, stdout) => {
          const responseTime = Date.now() - started;
          if (error) {
            resolve({
              status: CheckStatus.DOWN,
              responseTime: null,
              statusCode: null,
              message: `Host ${monitor.target} is unreachable`,
              certExpiresAt: null,
              certDaysRemaining: null,
            });
            return;
          }

          const match = stdout.match(/time[=<]([\d.]+)\s*ms/i);
          resolve({
            status: CheckStatus.UP,
            responseTime: match ? Math.round(parseFloat(match[1])) : responseTime,
            statusCode: null,
            message: null,
            certExpiresAt: null,
            certDaysRemaining: null,
          });
        }
      );
    });
  },
};
