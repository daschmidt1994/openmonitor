import { NotificationType } from "@openmonitor/shared";
import { emailProvider } from "./providers/email";
import { discordProvider } from "./providers/discord";
import { slackProvider } from "./providers/slack";
import { telegramProvider } from "./providers/telegram";
import { webhookProvider } from "./providers/webhook";
import { providerConfigSchemas } from "./config-schemas";
import type { NotificationEvent, NotificationProviderAdapter, NotificationSendResult } from "./types";

/**
 * Adding a new notification channel (e.g. Pushover, Matrix, ntfy) means:
 *  1. add a provider config zod schema in config-schemas.ts
 *  2. implement a NotificationProviderAdapter in providers/<name>.ts
 *  3. register both here.
 * Nothing else in apps/api or apps/worker needs to change.
 */
export const notificationProviderRegistry: Record<NotificationType, NotificationProviderAdapter<any>> = {
  [NotificationType.EMAIL]: emailProvider,
  [NotificationType.DISCORD]: discordProvider,
  [NotificationType.SLACK]: slackProvider,
  [NotificationType.TELEGRAM]: telegramProvider,
  [NotificationType.WEBHOOK]: webhookProvider,
};

export function validateProviderConfig(type: NotificationType, config: unknown) {
  return providerConfigSchemas[type].parse(config);
}

export async function sendNotification(
  type: NotificationType,
  config: unknown,
  event: NotificationEvent
): Promise<NotificationSendResult> {
  const adapter = notificationProviderRegistry[type];
  if (!adapter) return { success: false, error: `No notification provider registered for type ${type}` };

  const parsed = providerConfigSchemas[type].safeParse(config);
  if (!parsed.success) {
    return { success: false, error: `Invalid provider config: ${parsed.error.message}` };
  }

  return adapter.send(parsed.data, event);
}
