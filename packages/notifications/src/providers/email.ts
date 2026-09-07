import nodemailer from "nodemailer";
import { NotificationType } from "@openmonitor/shared";
import type { EmailProviderConfig } from "../config-schemas";
import type { NotificationEvent, NotificationProviderAdapter, NotificationSendResult } from "../types";

function renderSubject(event: NotificationEvent): string {
  return event.eventType === "DOWN"
    ? `[DOWN] ${event.monitorName} is unreachable`
    : `[RECOVERED] ${event.monitorName} is back up`;
}

function renderBody(event: NotificationEvent): string {
  const lines = [
    `Monitor: ${event.monitorName}`,
    `Target: ${event.monitorTarget}`,
    `Event: ${event.eventType}`,
    `Time: ${event.occurredAt.toISOString()}`,
  ];
  if (event.message) lines.push(`Details: ${event.message}`);
  if (event.downtimeDurationMs !== undefined) {
    lines.push(`Downtime: ${Math.round(event.downtimeDurationMs / 1000)}s`);
  }
  if (event.monitorUrl) lines.push(`Link: ${event.monitorUrl}`);
  return lines.join("\n");
}

export const emailProvider: NotificationProviderAdapter<EmailProviderConfig> = {
  type: NotificationType.EMAIL,
  async send(config, event): Promise<NotificationSendResult> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth:
          config.username && config.password
            ? { user: config.username, pass: config.password }
            : undefined,
      });

      await transporter.sendMail({
        from: config.fromAddress,
        to: config.toAddress,
        subject: renderSubject(event),
        text: renderBody(event),
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown email error" };
    }
  },
};
