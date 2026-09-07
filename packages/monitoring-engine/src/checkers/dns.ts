import * as dns from "node:dns";
import { CheckStatus, DnsRecordType } from "@openmonitor/shared";
import type { CheckResult, CheckableMonitor, Checker } from "../types";

function resolveByType(
  resolver: dns.promises.Resolver | typeof dns.promises,
  hostname: string,
  type: DnsRecordType
): Promise<string[]> {
  switch (type) {
    case DnsRecordType.A:
      return resolver.resolve4(hostname);
    case DnsRecordType.AAAA:
      return resolver.resolve6(hostname);
    case DnsRecordType.CNAME:
      return resolver.resolveCname(hostname);
    case DnsRecordType.MX:
      return resolver.resolveMx(hostname).then((records) => records.map((r) => r.exchange));
    case DnsRecordType.TXT:
      return resolver.resolveTxt(hostname).then((records) => records.map((r) => r.join("")));
    case DnsRecordType.NS:
      return resolver.resolveNs(hostname);
    default:
      return resolver.resolve4(hostname);
  }
}

export const dnsChecker: Checker = {
  async check(monitor: CheckableMonitor): Promise<CheckResult> {
    const started = Date.now();
    const recordType = monitor.dnsRecordType ?? DnsRecordType.A;

    let resolver: dns.promises.Resolver | typeof dns.promises = dns.promises;
    if (monitor.dnsResolver) {
      const customResolver = new dns.promises.Resolver();
      customResolver.setServers([monitor.dnsResolver]);
      resolver = customResolver;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`DNS lookup timed out after ${monitor.timeout}s`)), monitor.timeout * 1000)
      );

      const records = await Promise.race([resolveByType(resolver, monitor.target, recordType), timeoutPromise]);
      const responseTime = Date.now() - started;

      if (monitor.dnsExpectedValue) {
        const found = records.some((r) => r.toLowerCase() === monitor.dnsExpectedValue!.toLowerCase());
        if (!found) {
          return {
            status: CheckStatus.DOWN,
            responseTime,
            statusCode: null,
            message: `Expected DNS value "${monitor.dnsExpectedValue}" not found in [${records.join(", ")}]`,
            certExpiresAt: null,
            certDaysRemaining: null,
          };
        }
      }

      return {
        status: CheckStatus.UP,
        responseTime,
        statusCode: null,
        message: `Resolved: ${records.join(", ")}`,
        certExpiresAt: null,
        certDaysRemaining: null,
      };
    } catch (err) {
      return {
        status: CheckStatus.DOWN,
        responseTime: null,
        statusCode: null,
        message: err instanceof Error ? err.message : "DNS resolution failed",
        certExpiresAt: null,
        certDaysRemaining: null,
      };
    }
  },
};
