import { NotificationType } from "@openmonitor/shared";
import type { WebhookProviderConfig } from "../config-schemas";
import { postJson } from "../post-json";
import type { NotificationProviderAdapter, NotificationSendResult } from "../types";

export const webhookProvider: NotificationProviderAdapter<WebhookProviderConfig> = {
  type: NotificationType.WEBHOOK,
  async send(config, event): Promise<NotificationSendResult> {
    try {
      const res = await postJson(
        config.url,
        {
          event: event.eventType,
          monitorName: event.monitorName,
          monitorTarget: event.monitorTarget,
          message: event.message,
          occurredAt: event.occurredAt.toISOString(),
          downtimeDurationMs: event.downtimeDurationMs ?? null,
          monitorUrl: event.monitorUrl ?? null,
        },
        { method: config.method, headers: config.headers }
      );
      if (!res.ok) return { success: false, error: `Webhook returned ${res.status}: ${res.text}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown webhook error" };
    }
  },
};
