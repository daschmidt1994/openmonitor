import { CheckStatus } from "@openmonitor/shared";
import { calculateUptimeStats } from "../uptime";

describe("calculateUptimeStats", () => {
  it("returns 100% uptime when there are no checks", () => {
    const stats = calculateUptimeStats([]);
    expect(stats.uptimePercentage).toBe(100);
    expect(stats.totalChecks).toBe(0);
  });

  it("returns 100% for an all-UP series", () => {
    const base = Date.now();
    const points = [0, 1, 2, 3].map((i) => ({
      status: CheckStatus.UP,
      checkedAt: new Date(base + i * 60_000),
    }));
    expect(calculateUptimeStats(points).uptimePercentage).toBe(100);
  });

  it("weights downtime by the duration between checks", () => {
    const base = Date.now();
    // UP for 60s, then DOWN for 60s, then a final UP marker.
    const points = [
      { status: CheckStatus.UP, checkedAt: new Date(base) },
      { status: CheckStatus.DOWN, checkedAt: new Date(base + 60_000) },
      { status: CheckStatus.UP, checkedAt: new Date(base + 120_000) },
    ];
    const stats = calculateUptimeStats(points);
    expect(stats.uptimePercentage).toBe(50);
    expect(stats.totalDowntimeMs).toBe(60_000);
    expect(stats.downChecks).toBe(1);
  });

  it("is order-independent (sorts internally)", () => {
    const base = Date.now();
    const points = [
      { status: CheckStatus.UP, checkedAt: new Date(base + 120_000) },
      { status: CheckStatus.UP, checkedAt: new Date(base) },
      { status: CheckStatus.DOWN, checkedAt: new Date(base + 60_000) },
    ];
    expect(calculateUptimeStats(points).uptimePercentage).toBe(50);
  });
});
