import type {
  ApiScope,
  CheckStatus,
  DnsRecordType,
  IncidentStatus,
  MonitorType,
  NotificationType,
  PaginatedResult,
  Role,
} from "@openmonitor/shared";

export type { PaginatedResult };

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: MonitorType;
  target: string;
  port: number | null;
  interval: number;
  timeout: number;
  retries: number;
  retryInterval: number;
  httpMethod?: string | null;
  httpHeaders?: Record<string, string> | null;
  httpBody?: string | null;
  expectedStatusCodes?: string | null;
  keyword?: string | null;
  keywordInverted?: boolean;
  followRedirects?: boolean;
  ignoreTlsErrors?: boolean;
  jsonPath?: string | null;
  jsonExpectedValue?: string | null;
  dnsRecordType?: DnsRecordType | null;
  dnsExpectedValue?: string | null;
  dnsResolver?: string | null;
  checkSslExpiry?: boolean;
  sslExpiryThresholdDays?: number;
  upsideDown: boolean;
  active: boolean;
  currentStatus: CheckStatus;
  consecutiveFailures: number;
  lastCheckAt: string | null;
  nextCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ tag: Tag }>;
}

export interface MonitorCheck {
  id: string;
  monitorId: string;
  status: CheckStatus;
  responseTime: number | null;
  statusCode: number | null;
  message: string | null;
  certExpiresAt: string | null;
  certDaysRemaining: number | null;
  checkedAt: string;
}

export interface UptimeStats {
  uptimePercentage: number;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  totalDowntimeMs: number;
}

export interface MonitorHistory {
  monitorId: string;
  range: "1h" | "24h" | "7d" | "30d";
  uptime: UptimeStats;
  checks: MonitorCheck[];
}

export interface MonitorStats {
  totalMonitors: number;
  up: number;
  down: number;
  paused: number;
  averageResponseTimeMs: number | null;
  ongoingIncidents: number;
}

export interface Incident {
  id: string;
  monitorId: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt: string | null;
  message: string | null;
  monitor?: { id: string; name: string; type: MonitorType; target: string };
}

export interface NotificationProvider {
  id: string;
  userId: string;
  name: string;
  type: NotificationType;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: string;
}

export interface MonitorNotificationLink {
  monitorId: string;
  providerId: string;
  notifyOnDown: boolean;
  notifyOnRecovery: boolean;
  resendIntervalMinutes: number;
  provider: NotificationProvider;
}

export interface StatusPage {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  customCss: string | null;
  createdAt: string;
  monitors?: Array<{ monitorId: string; order: number; label: string | null; monitor: Monitor }>;
}

export interface PublicStatusPage {
  name: string;
  description: string | null;
  logoUrl: string | null;
  customCss: string | null;
  monitors: Array<{
    id: string;
    name: string;
    type: MonitorType;
    currentStatus: CheckStatus;
    order: number;
    uptime24h: number;
    averageResponseTimeMs: number | null;
    incidents: Incident[];
  }>;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedApiToken extends ApiToken {
  token: string;
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
  userCount: number;
  monitorCount: number;
  activeIncidents: number;
  checksLast24h: number;
}

export interface SystemSettings {
  registrationEnabled: boolean;
  checkRetentionDays: number;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
  requestId?: string;
}
