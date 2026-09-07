import { NotificationType } from "@openmonitor/shared";
import type { SlackProviderConfig } from "../config-schemas";
import { postJson } from "../post-json";
import type { NotificationProviderAdapter, NotificationSendResult } from "../types";

export const slackProvider: NotificationProviderAdapter<SlackProviderConfig> = {
  type: NotificationType.SLACK,
  async send(config, event): Promise<NotificationSendResult> {
    try {
      const emoji = event.eventType === "DOWN" ? ":red_circle:" : ":large_green_circle:";
      const title =
        event.eventType === "DOWN" ? `${event.monitorName} is DOWN` : `${event.monitorName} recovered`;
      const text = [
        `${emoji} *${title}*`,
        `Target: ${event.monitorTarget}`,
        event.message ? `Details: ${event.message}` : null,
        `Time: ${event.occurredAt.toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await postJson(config.webhookUrl, {
        channel: config.channel,
        text,
      });
      if (!res.ok) return { success: false, error: `Slack webhook returned ${res.status}: ${res.text}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown Slack error" };
    }
  },
};
