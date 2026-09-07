export enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  READONLY = "READONLY",
}

export enum MonitorType {
  HTTP = "HTTP",
  TCP = "TCP",
  PING = "PING",
  DNS = "DNS",
  SSL = "SSL",
  JSON_QUERY = "JSON_QUERY",
}

export enum CheckStatus {
  UP = "UP",
  DOWN = "DOWN",
  PENDING = "PENDING",
}

export enum IncidentStatus {
  ONGOING = "ONGOING",
  RESOLVED = "RESOLVED",
}

export enum NotificationType {
  EMAIL = "EMAIL",
  DISCORD = "DISCORD",
  SLACK = "SLACK",
  TELEGRAM = "TELEGRAM",
  WEBHOOK = "WEBHOOK",
}

export enum DnsRecordType {
  A = "A",
  AAAA = "AAAA",
  CNAME = "CNAME",
  MX = "MX",
  TXT = "TXT",
  NS = "NS",
}

/** API token scopes. Checked by the ScopeGuard on every token-authenticated request. */
export enum ApiScope {
  MONITORS_READ = "monitors:read",
  MONITORS_WRITE = "monitors:write",
  INCIDENTS_READ = "incidents:read",
  STATUS_PAGES_READ = "status-pages:read",
  STATUS_PAGES_WRITE = "status-pages:write",
  NOTIFICATIONS_READ = "notifications:read",
  NOTIFICATIONS_WRITE = "notifications:write",
  USERS_READ = "users:read",
}

export const ALL_API_SCOPES: ApiScope[] = Object.values(ApiScope);
