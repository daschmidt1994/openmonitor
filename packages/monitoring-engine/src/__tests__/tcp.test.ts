import * as net from "node:net";
import { CheckStatus } from "@openmonitor/shared";
import { tcpChecker } from "../checkers/tcp";

describe("tcpChecker", () => {
  it("reports UP when it can connect to an open port", async () => {
    const server = net.createServer((socket) => socket.end());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as net.AddressInfo).port;

    const result = await tcpChecker.check({
      type: "TCP" as any,
      target: "127.0.0.1",
      port,
      timeout: 2,
    });

    expect(result.status).toBe(CheckStatus.UP);
    expect(result.responseTime).toBeGreaterThanOrEqual(0);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("reports DOWN when connecting to a closed port", async () => {
    const result = await tcpChecker.check({
      type: "TCP" as any,
      target: "127.0.0.1",
      port: 1, // reserved/typically closed
      timeout: 1,
    });
    expect(result.status).toBe(CheckStatus.DOWN);
  }, 10_000);

  it("reports DOWN when no port is configured", async () => {
    const result = await tcpChecker.check({
      type: "TCP" as any,
      target: "127.0.0.1",
      timeout: 1,
    });
    expect(result.status).toBe(CheckStatus.DOWN);
    expect(result.message).toMatch(/no port/i);
  });
});
