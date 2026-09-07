import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { ApiScope, Role } from "@openmonitor/shared";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { EnvConfig } from "../../config/env.validation";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  authMethod: "jwt" | "api_token";
  tokenScopes?: ApiScope[];
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Single entry point for authentication. Accepts either:
 *  - a short-lived JWT access token (web/mobile session), or
 *  - a long-lived API token prefixed with API_TOKEN_PREFIX (default "om_"),
 *    looked up by its SHA-256 hash and never stored/compared in plaintext.
 * Populates request.user for downstream guards (RolesGuard, ScopesGuard)
 * and services (tenant isolation).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const apiTokenPrefix = this.config.get("API_TOKEN_PREFIX", { infer: true });

    if (token.startsWith(apiTokenPrefix)) {
      request.user = await this.authenticateApiToken(token);
    } else {
      request.user = await this.authenticateJwt(token);
    }
    return true;
  }

  /**
   * Verifies the JWT signature/expiry, then re-reads the user's current role
   * and active flag from the database rather than trusting the token's
   * embedded claims. This is one extra query per request, but it means a
   * deactivation or role change by an admin takes effect immediately instead
   * of waiting out the access token's TTL.
   */
  private async authenticateJwt(token: string): Promise<AuthenticatedUser> {
    let sub: string;
    try {
      const secret = this.config.get("JWT_ACCESS_SECRET", { infer: true });
      const payload = jwt.verify(token, secret) as { sub: string };
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.active) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return { id: user.id, role: user.role as Role, authMethod: "jwt" };
  }

  private async authenticateApiToken(token: string): Promise<AuthenticatedUser> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.apiToken.findUnique({ where: { tokenHash } });

    if (!record || record.revokedAt || (record.expiresAt && record.expiresAt < new Date())) {
      throw new UnauthorizedException("Invalid or revoked API token");
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException("User account is inactive");
    }

    // Best-effort last-used tracking; do not block the request on it.
    void this.prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);

    return {
      id: user.id,
      role: user.role as Role,
      authMethod: "api_token",
      tokenScopes: record.scopes as ApiScope[],
    };
  }
}
