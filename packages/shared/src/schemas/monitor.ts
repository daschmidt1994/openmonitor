import { z } from "zod";
import { DnsRecordType, MonitorType } from "../enums";

const httpMethods = ["GET", "POST", "PUT", "PATCH", "HEAD", "OPTIONS"] as const;

export const monitorBaseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.nativeEnum(MonitorType),
  target: z.string().min(1).max(2048),
  port: z.number().int().min(1).max(65535).optional().nullable(),

  interval: z.number().int().min(10).max(86400).default(60),
  timeout: z.number().int().min(1).max(300).default(10),
  retries: z.number().int().min(0).max(10).default(3),
  retryInterval: z.number().int().min(1).max(3600).default(20),

  httpMethod: z.enum(httpMethods).default("GET").optional(),
  httpHeaders: z.record(z.string()).optional().nullable(),
  httpBody: z.string().max(65536).optional().nullable(),
  expectedStatusCodes: z.string().max(200).default("200-299").optional(),
  keyword: z.string().max(500).optional().nullable(),
  keywordInverted: z.boolean().default(false).optional(),
  followRedirects: z.boolean().default(true).optional(),
  ignoreTlsErrors: z.boolean().default(false).optional(),

  jsonPath: z.string().max(500).optional().nullable(),
  jsonExpectedValue: z.string().max(500).optional().nullable(),

  dnsRecordType: z.nativeEnum(DnsRecordType).optional().nullable(),
  dnsExpectedValue: z.string().max(500).optional().nullable(),
  dnsResolver: z.string().max(255).optional().nullable(),

  checkSslExpiry: z.boolean().default(false).optional(),
  sslExpiryThresholdDays: z.number().int().min(1).max(365).default(14).optional(),

  upsideDown: z.boolean().default(false).optional(),
  active: z.boolean().default(true).optional(),

  tagIds: z.array(z.string().uuid()).optional(),
});

export const createMonitorSchema = monitorBaseSchema;
export const updateMonitorSchema = monitorBaseSchema.partial();

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;

export const monitorHistoryQuerySchema = z.object({
  range: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
});
export type MonitorHistoryQuery = z.infer<typeof monitorHistoryQuerySchema>;
