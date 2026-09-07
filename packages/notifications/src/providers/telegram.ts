import { NotificationType } from "@openmonitor/shared";
import type { TelegramProviderConfig } from "../config-schemas";
import { postJson } from "../post-json";
import type { NotificationProviderAdapter, NotificationSendResult } from "../types";

export const telegramProvider: NotificationProviderAdapter<TelegramProviderConfig> = {
  type: NotificationType.TELEGRAM,
  async send(config, event): Promise<NotificationSendResult> {
    try {
      const title = event.eventType === "DOWN" ? `🔴 ${event.monitorName} is DOWN` : `🟢 ${event.monitorName} recovered`;
      const text = [
        title,
        `Target: ${event.monitorTarget}`,
        event.message ? `Details: ${event.message}` : null,
        `Time: ${event.occurredAt.toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n");

      const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
      const res = await postJson(url, { chat_id: config.chatId, text });
      if (!res.ok) return { success: false, error: `Telegram API returned ${res.status}: ${res.text}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown Telegram error" };
    }
  },
};
