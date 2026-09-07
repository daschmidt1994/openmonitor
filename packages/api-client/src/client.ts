import type { ApiScope } from "@openmonitor/shared";
import type {
  ApiErrorBody,
  ApiToken,
  AuthTokens,
  CreatedApiToken,
  Incident,
  Monitor,
  MonitorHistory,
  MonitorNotificationLink,
  MonitorStats,
  NotificationProvider,
  PaginatedResult,
  PublicStatusPage,
  StatusPage,
  SystemInfo,
  SystemSettings,
  User,
} from "./types";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | undefined
  ) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiClientError";
  }
}

export interface OpenMonitorClientOptions {
  baseUrl: string;
  getTokens: () => AuthTokens | null;
  setTokens: (tokens: AuthTokens | null) => void;
}

type Query = Record<string, string | number | boolean | undefined>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

/**
 * Thin typed REST client for the OpenMonitor API. Shared between the Next.js
 * web app and any other TypeScript/JavaScript consumer (scripts, future
 * clients); the Android app talks to the same REST API directly over
 * Retrofit rather than through this package.
 *
 * Handles access-token attachment and a single transparent refresh-and-retry
 * on a 401, using the injected getTokens/setTokens so the caller controls
 * where tokens actually live (cookies, localStorage, memory, ...).
 */
export class OpenMonitorClient {
  constructor(private readonly options: OpenMonitorClientOptions) {}

  private async request<T>(
    path: string,
    init: RequestInit & { query?: Query } = {},
    opts: { auth?: boolean; retry?: boolean } = {}
  ): Promise<T> {
    const { query, ...rest } = init;
    const auth = opts.auth ?? true;
    const headers = new Headers(rest.headers);
    headers.set("Content-Type", "application/json");

    if (auth) {
      const tokens = this.options.getTokens();
      if (tokens?.accessToken) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }

    const res = await fetch(`${this.options.baseUrl}${path}${buildQuery(query)}`, { ...rest, headers });

    if (res.status === 401 && auth && opts.retry !== false) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(path, init, { ...opts, retry: false });
    }

    if (!res.ok) {
      let body: ApiErrorBody | undefined;
      try {
        body = await res.json();
      } catch {
        // ignore non-JSON error bodies
      }
      throw new ApiClientError(res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const tokens = this.options.getTokens();
    if (!tokens?.refreshToken) return false;
    try {
      const newTokens = await this.request<AuthTokens>(
        "/api/v1/auth/refresh",
        { method: "POST", body: JSON.stringify({ refreshToken: tokens.refreshToken }) },
        { auth: false }
      );
      this.options.setTokens(newTokens);
      return true;
    } catch {
      this.options.setTokens(null);
      return false;
    }
  }

  auth = {
    register: (input: { email: string; username: string; password: string }) =>
      this.request<{ user: User; tokens: AuthTokens }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) }, { auth: false }),
    login: (input: { email: string; password: string }) =>
      this.request<{ user: User; tokens: AuthTokens }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(input) }, { auth: false }),
    logout: (refreshToken: string) =>
      this.request<{ success: true }>("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
    changePassword: (input: { currentPassword: string; newPassword: string }) =>
      this.request<{ success: true }>("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify(input) }),
    requestPasswordReset: (email: string) =>
      this.request<{ resetToken?: string }>("/api/v1/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }, { auth: false }),
    resetPassword: (token: string, newPassword: string) =>
      this.request<{ success: true }>("/api/v1/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ token, newPassword }) }, { auth: false }),
  };

  users = {
    me: () => this.request<User>("/api/v1/me"),
    updateMe: (input: { username?: string; timezone?: string }) =>
      this.request<User>("/api/v1/me", { method: "PATCH", body: JSON.stringify(input) }),
    list: (query?: Query) => this.request<PaginatedResult<User>>("/api/v1/users", { query }),
    create: (input: { email: string; username: string; password: string; role: string }) =>
      this.request<User>("/api/v1/users", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: { role?: string; active?: boolean }) =>
      this.request<User>(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => this.request<{ success: true }>(`/api/v1/users/${id}`, { method: "DELETE" }),
  };

  monitors = {
    list: (query?: Query) => this.request<PaginatedResult<Monitor>>("/api/v1/monitors", { query }),
    stats: () => this.request<MonitorStats>("/api/v1/monitors/stats"),
    get: (id: string) => this.request<Monitor>(`/api/v1/monitors/${id}`),
    create: (input: Record<string, unknown>) => this.request<Monitor>("/api/v1/monitors", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Record<string, unknown>) =>
      this.request<Monitor>(`/api/v1/monitors/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => this.request<{ success: true }>(`/api/v1/monitors/${id}`, { method: "DELETE" }),
    history: (id: string, range: "1h" | "24h" | "7d" | "30d" = "24h") =>
      this.request<MonitorHistory>(`/api/v1/monitors/${id}/history`, { query: { range } }),
  };

  tags = {
    list: () => this.request<Array<{ id: string; name: string; color: string }>>("/api/v1/tags"),
    create: (input: { name: string; color?: string }) =>
      this.request<{ id: string; name: string; color: string }>("/api/v1/tags", { method: "POST", body: JSON.stringify(input) }),
    remove: (id: string) => this.request<{ success: true }>(`/api/v1/tags/${id}`, { method: "DELETE" }),
  };

  incidents = {
    list: (query?: Query) => this.request<PaginatedResult<Incident>>("/api/v1/incidents", { query }),
    get: (id: string) => this.request<Incident>(`/api/v1/incidents/${id}`),
  };

  notifications = {
    list: () => this.request<NotificationProvider[]>("/api/v1/notifications"),
    create: (input: { name: string; type: string; config: Record<string, unknown>; active?: boolean }) =>
      this.request<NotificationProvider>("/api/v1/notifications", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Record<string, unknown>) =>
      this.request<NotificationProvider>(`/api/v1/notifications/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => this.request<{ success: true }>(`/api/v1/notifications/${id}`, { method: "DELETE" }),
    test: (id: string) => this.request<{ success: true }>(`/api/v1/notifications/${id}/test`, { method: "POST" }),
    listForMonitor: (monitorId: string) =>
      this.request<MonitorNotificationLink[]>(`/api/v1/monitors/${monitorId}/notifications`),
    link: (monitorId: string, providerId: string, input: { notifyOnDown?: boolean; notifyOnRecovery?: boolean; resendIntervalMinutes?: number }) =>
      this.request<MonitorNotificationLink>(`/api/v1/monitors/${monitorId}/notifications/${providerId}`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    unlink: (monitorId: string, providerId: string) =>
      this.request<{ success: true }>(`/api/v1/monitors/${monitorId}/notifications/${providerId}`, { method: "DELETE" }),
  };

  statusPages = {
    list: () => this.request<StatusPage[]>("/api/v1/status-pages"),
    get: (id: string) => this.request<StatusPage>(`/api/v1/status-pages/${id}`),
    create: (input: { name: string; slug: string; description?: string; isPublic?: boolean }) =>
      this.request<StatusPage>("/api/v1/status-pages", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Record<string, unknown>) =>
      this.request<StatusPage>(`/api/v1/status-pages/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => this.request<{ success: true }>(`/api/v1/status-pages/${id}`, { method: "DELETE" }),
    addMonitor: (id: string, monitorId: string, input: { order?: number; label?: string } = {}) =>
      this.request(`/api/v1/status-pages/${id}/monitors/${monitorId}`, { method: "POST", body: JSON.stringify(input) }),
    removeMonitor: (id: string, monitorId: string) =>
      this.request<{ success: true }>(`/api/v1/status-pages/${id}/monitors/${monitorId}`, { method: "DELETE" }),
    getPublic: (slug: string) => this.request<PublicStatusPage>(`/api/v1/status-pages/public/${slug}`, {}, { auth: false }),
  };

  apiTokens = {
    list: () => this.request<ApiToken[]>("/api/v1/api-tokens"),
    create: (input: { name: string; scopes: ApiScope[]; expiresAt?: string }) =>
      this.request<CreatedApiToken>("/api/v1/api-tokens", { method: "POST", body: JSON.stringify(input) }),
    revoke: (id: string) => this.request<{ success: true }>(`/api/v1/api-tokens/${id}`, { method: "DELETE" }),
  };

  system = {
    info: () => this.request<SystemInfo>("/api/v1/system/info"),
    getSettings: () => this.request<SystemSettings>("/api/v1/system/settings"),
    updateSettings: (input: Partial<SystemSettings>) =>
      this.request<SystemSettings>("/api/v1/system/settings", { method: "PATCH", body: JSON.stringify(input) }),
  };
}
