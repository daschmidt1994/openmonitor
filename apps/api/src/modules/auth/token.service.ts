import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { hashToken } from "../../common/guards/auth.guard";
import type { EnvConfig } from "../../config/env.validation";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService
  ) {}

  signAccessToken(userId: string, role: Role): string {
    const secret = this.config.get("JWT_ACCESS_SECRET", { infer: true });
    const ttl = this.config.get("JWT_ACCESS_TTL", { infer: true });
    return jwt.sign({ sub: userId, role }, secret, { expiresIn: ttl } as jwt.SignOptions);
  }

  async issueTokenPair(
    userId: string,
    role: Role,
    meta: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair> {
    const accessToken = this.signAccessToken(userId, role);
    const refreshToken = await this.createRefreshToken(userId, meta);
    return { accessToken, refreshToken, accessTokenExpiresIn: this.config.get("JWT_ACCESS_TTL", { infer: true }) };
  }

  private async createRefreshToken(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string }
  ): Promise<string> {
    const raw = randomBytes(48).toString("base64url");
    const ttlDays = this.config.get("JWT_REFRESH_TTL_DAYS", { infer: true });
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        userAgent: meta.userAgent?.slice(0, 500),
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    return raw;
  }

  /**
   * Validates and rotates a refresh token: the presented token is revoked
   * and a brand new refresh token + access token pair is issued. If a
   * revoked (already-used) token is presented again, this is treated as a
   * possible token theft signal and all of the user's sessions are revoked.
   */
  async rotateRefreshToken(
    presentedToken: string,
    meta: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenPair> {
    const tokenHash = hashToken(presentedToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    if (record.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error("REUSED_REFRESH_TOKEN");
    }

    if (record.expiresAt < new Date()) {
      throw new Error("EXPIRED_REFRESH_TOKEN");
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.active) {
      throw new Error("USER_INACTIVE");
    }

    const newRefreshToken = await this.createRefreshToken(user.id, meta);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedByToken: hashToken(newRefreshToken) },
    });

    const accessToken = this.signAccessToken(user.id, user.role as Role);
    return { accessToken, refreshToken: newRefreshToken, accessTokenExpiresIn: this.config.get("JWT_ACCESS_TTL", { infer: true }) };
  }

  async revokeRefreshToken(presentedToken: string): Promise<void> {
    const tokenHash = hashToken(presentedToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
