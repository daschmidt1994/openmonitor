import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Thin key-value store for global settings an admin can change at runtime
 * (e.g. "is self-registration open?") without redeploying with new env vars.
 * Falls back to the provided default when no row exists yet.
 */
@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBool(key: string, fallback: boolean): Promise<boolean> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    return Boolean(row.value);
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}
