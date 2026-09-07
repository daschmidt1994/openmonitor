import { CheckStatus, DnsRecordType, MonitorType } from "@openmonitor/shared";

/**
 * The subset of Monitor configuration a checker needs. Deliberately decoupled
 * from the Prisma model so this package has no dependency on the database
 * layer and can be unit-tested in isolation (and reused by, e.g., a future
 * CLI or the Android app's local validation).
 */
export interface CheckableMonitor {
  type: MonitorType;
  target: string;
  port?: number | null;
  timeout: number; // seconds

  httpMethod?: string | null;
  httpHeaders?: Record<string, string> | null;
  httpBody?: string | null;
  expectedStatusCodes?: string | null;
  keyword?: string | null;
  keywordInverted?: boolean | null;
  followRedirects?: boolean | null;
  ignoreTlsErrors?: boolean | null;

  jsonPath?: string | null;
  jsonExpectedValue?: string | null;

  dnsRecordType?: DnsRecordType | null;
  dnsExpectedValue?: string | null;
  dnsResolver?: string | null;

  checkSslExpiry?: boolean | null;
  sslExpiryThresholdDays?: number | null;

  upsideDown?: boolean | null;
}

export interface CheckResult {
  status: CheckStatus;
  responseTime: number | null; // ms
  statusCode: number | null;
  message: string | null;
  certExpiresAt: Date | null;
  certDaysRemaining: number | null;
}

export interface Checker {
  check(monitor: CheckableMonitor): Promise<CheckResult>;
}
