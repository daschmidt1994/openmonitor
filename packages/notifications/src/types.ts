import { NotificationType } from "@openmonitor/shared";

export type NotificationEventType = "DOWN" | "RECOVERY";

export interface NotificationEvent {
  eventType: NotificationEventType;
  monitorName: string;
  monitorTarget: string;
  message: string | null;
  occurredAt: Date;
  /** Present when eventType === "RECOVERY" */
  downtimeDurationMs?: number;
  /** Absolute URL to the monitor's detail page, if a public base URL is configured. */
  monitorUrl?: string;
}

export interface NotificationSendResult {
  success: boolean;
  error?: string;
}

export interface NotificationProviderAdapter<TConfig = Record<string, unknown>> {
  readonly type: NotificationType;
  send(config: TConfig, event: NotificationEvent): Promise<NotificationSendResult>;
}
