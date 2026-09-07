import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { CheckStatus } from "@openmonitor/shared";
import { httpChecker } from "../checkers/http";

describe("httpChecker", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("hello world");
      } else if (req.url === "/error") {
        res.writeHead(500);
        res.end("boom");
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("reports UP for a 200 response within the expected status range", async () => {
    const result = await httpChecker.check({
      type: "HTTP" as any,
      target: `${baseUrl}/ok`,
      timeout: 5,
      expectedStatusCodes: "200-299",
    });
    expect(result.status).toBe(CheckStatus.UP);
    expect(result.statusCode).toBe(200);
  });

  it("reports DOWN for an unexpected status code", async () => {
    const result = await httpChecker.check({
      type: "HTTP" as any,
      target: `${baseUrl}/error`,
      timeout: 5,
      expectedStatusCodes: "200-299",
    });
    expect(result.status).toBe(CheckStatus.DOWN);
    expect(result.statusCode).toBe(500);
  });

  it("validates a required keyword", async () => {
    const result = await httpChecker.check({
      type: "HTTP" as any,
      target: `${baseUrl}/ok`,
      timeout: 5,
      expectedStatusCodes: "200-299",
      keyword: "hello",
    });
    expect(result.status).toBe(CheckStatus.UP);

    const missing = await httpChecker.check({
      type: "HTTP" as any,
      target: `${baseUrl}/ok`,
      timeout: 5,
      expectedStatusCodes: "200-299",
      keyword: "not-present",
    });
    expect(missing.status).toBe(CheckStatus.DOWN);
  });

  it("reports DOWN when the connection fails", async () => {
    const result = await httpChecker.check({
      type: "HTTP" as any,
      target: "http://127.0.0.1:1",
      timeout: 2,
    });
    expect(result.status).toBe(CheckStatus.DOWN);
  });
});
