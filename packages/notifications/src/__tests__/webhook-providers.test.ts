import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { NotificationType } from "@openmonitor/shared";
import { sendNotification } from "../registry";
import type { NotificationEvent } from "../types";

describe("webhook-style notification providers", () => {
  let server: http.Server;
  let receivedBody: string | null;
  let receivedPath: string;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedPath = req.url ?? "";
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        receivedBody = Buffer.concat(chunks).toString("utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const event: NotificationEvent = {
    eventType: "DOWN",
    monitorName: "My API",
    monitorTarget: "https://api.example.com",
    message: "Connection refused",
    occurredAt: new Date("2026-01-01T00:00:00Z"),
  };

  it("sends a generic webhook with the event payload", async () => {
    const result = await sendNotification(NotificationType.WEBHOOK, { url: `${baseUrl}/hook` }, event);
    expect(result.success).toBe(true);
    expect(receivedPath).toBe("/hook");
    const parsed = JSON.parse(receivedBody!);
    expect(parsed.event).toBe("DOWN");
    expect(parsed.monitorName).toBe("My API");
  });

  it("sends a Discord embed payload", async () => {
    const result = await sendNotification(NotificationType.DISCORD, { webhookUrl: `${baseUrl}/discord` }, event);
    expect(result.success).toBe(true);
    const parsed = JSON.parse(receivedBody!);
    expect(parsed.embeds[0].title).toContain("My API");
  });

  it("sends a Slack message payload", async () => {
    const result = await sendNotification(NotificationType.SLACK, { webhookUrl: `${baseUrl}/slack` }, event);
    expect(result.success).toBe(true);
    const parsed = JSON.parse(receivedBody!);
    expect(parsed.text).toContain("My API");
  });

  it("rejects an invalid provider config before sending", async () => {
    const result = await sendNotification(NotificationType.WEBHOOK, { url: "not-a-url" }, event);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid provider config/i);
  });
});
