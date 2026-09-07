import { NotificationType } from "@openmonitor/shared";
import type { DiscordProviderConfig } from "../config-schemas";
import { postJson } from "../post-json";
import type { NotificationProviderAdapter, NotificationSendResult } from "../types";

export const discordProvider: NotificationProviderAdapter<DiscordProviderConfig> = {
  type: NotificationType.DISCORD,
  async send(config, event): Promise<NotificationSendResult> {
    try {
      const color = event.eventType === "DOWN" ? 0xdc2626 : 0x16a34a;
      const res = await postJson(config.webhookUrl, {
        username: config.username ?? "OpenMonitor",
        embeds: [
          {
            title: event.eventType === "DOWN" ? `🔴 ${event.monitorName} is DOWN` : `🟢 ${event.monitorName} recovered`,
            description: event.message ?? undefined,
            color,
            fields: [
              { name: "Target", value: event.monitorTarget, inline: true },
              { name: "Time", value: event.occurredAt.toISOString(), inline: true },
            ],
            url: event.monitorUrl,
          },
        ],
      });
      if (!res.ok) return { success: false, error: `Discord webhook returned ${res.status}: ${res.text}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown Discord error" };
    }
  },
};
