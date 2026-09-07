import { z } from "zod";

export const emailProviderConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(true),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  fromAddress: z.string().email(),
  toAddress: z.string().email(),
});
export type EmailProviderConfig = z.infer<typeof emailProviderConfigSchema>;

export const discordProviderConfigSchema = z.object({
  webhookUrl: z.string().url(),
  username: z.string().optional(),
});
export type DiscordProviderConfig = z.infer<typeof discordProviderConfigSchema>;

export const slackProviderConfigSchema = z.object({
  webhookUrl: z.string().url(),
  channel: z.string().optional(),
});
export type SlackProviderConfig = z.infer<typeof slackProviderConfigSchema>;

export const telegramProviderConfigSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});
export type TelegramProviderConfig = z.infer<typeof telegramProviderConfigSchema>;

export const webhookProviderConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["POST", "PUT"]).default("POST"),
  headers: z.record(z.string()).optional(),
});
export type WebhookProviderConfig = z.infer<typeof webhookProviderConfigSchema>;

export const providerConfigSchemas = {
  EMAIL: emailProviderConfigSchema,
  DISCORD: discordProviderConfigSchema,
  SLACK: slackProviderConfigSchema,
  TELEGRAM: telegramProviderConfigSchema,
  WEBHOOK: webhookProviderConfigSchema,
} as const;
