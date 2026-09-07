import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SystemSettingsService } from "../../common/system-settings/system-settings.service";
import type { EnvConfig } from "../../config/env.validation";
import type { UpdateSystemSettingsDto } from "./dto/update-settings.dto";

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

@Injectable()
export class SystemService {
  private readonly version = readVersion();
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemSettingsService,
    private readonly config: ConfigService<EnvConfig, true>
  ) {}

  async getInfo() {
    const [userCount, monitorCount, activeIncidents, checksLast24h] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.monitor.count(),
      this.prisma.incident.count({ where: { status: "ONGOING" } }),
      this.prisma.monitorCheck.count({ where: { checkedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    return {
      version: this.version,
      nodeVersion: process.version,
      environment: this.config.get("NODE_ENV", { infer: true }),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      userCount,
      monitorCount,
      activeIncidents,
      checksLast24h,
    };
  }

  async getSettings() {
    const registrationEnabled = await this.systemSettings.getBool(
      "registration_enabled",
      this.config.get("REGISTRATION_ENABLED", { infer: true })
    );
    const all = await this.systemSettings.getAll();
    return {
      registrationEnabled,
      checkRetentionDays: (all["check_retention_days"] as number | undefined) ?? this.config.get("CHECK_RETENTION_DAYS", { infer: true }),
    };
  }

  async updateSettings(dto: UpdateSystemSettingsDto) {
    if (dto.registrationEnabled !== undefined) {
      await this.systemSettings.set("registration_enabled", dto.registrationEnabled);
    }
    if (dto.checkRetentionDays !== undefined) {
      await this.systemSettings.set("check_retention_days", dto.checkRetentionDays);
    }
    return this.getSettings();
  }
}
