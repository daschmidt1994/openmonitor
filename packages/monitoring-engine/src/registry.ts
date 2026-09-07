import { MonitorType } from "@openmonitor/shared";
import { httpChecker } from "./checkers/http";
import { jsonQueryChecker } from "./checkers/json-query";
import { tcpChecker } from "./checkers/tcp";
import { pingChecker } from "./checkers/ping";
import { dnsChecker } from "./checkers/dns";
import { sslChecker } from "./checkers/ssl";
import type { Checker } from "./types";

/**
 * Central registry mapping a MonitorType to its Checker implementation.
 * Adding a new monitor type (Docker, Postgres, MySQL, ...) means adding one
 * entry here plus a checker module -- nothing else in the worker needs to
 * change (see apps/worker/src/engine/run-check.ts).
 */
export const checkerRegistry: Record<MonitorType, Checker> = {
  [MonitorType.HTTP]: httpChecker,
  [MonitorType.JSON_QUERY]: jsonQueryChecker,
  [MonitorType.TCP]: tcpChecker,
  [MonitorType.PING]: pingChecker,
  [MonitorType.DNS]: dnsChecker,
  [MonitorType.SSL]: sslChecker,
};

export function getChecker(type: MonitorType): Checker {
  const checker = checkerRegistry[type];
  if (!checker) throw new Error(`No checker registered for monitor type ${type}`);
  return checker;
}
