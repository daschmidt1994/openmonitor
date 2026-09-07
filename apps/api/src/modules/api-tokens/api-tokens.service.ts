import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { hashToken } from "../../common/guards/auth.guard";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import type { EnvConfig } from "../../config/env.validation";
import type { CreateApiTokenDto } from "./dto/create-api-token.dto";

@Injectable()
export class ApiTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService<EnvConfig, true>
  ) {}

  async list(user: AuthenticatedUser) {
    const tokens = await this.prisma.apiToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return tokens.map(({ tokenHash: _tokenHash, ...rest }) => rest);
  }

  async create(user: AuthenticatedUser, dto: CreateApiTokenDto) {
    const prefix = this.config.get("API_TOKEN_PREFIX", { infer: true });
    const secret = randomBytes(32).toString("base64url");
    const plaintextToken = `${prefix}${secret}`;
    const tokenPrefix = plaintextToken.slice(0, prefix.length + 8);

    const record = await this.prisma.apiToken.create({
      data: {
        userId: user.id,
        name: dto.name,
        scopes: dto.scopes,
        tokenPrefix,
        tokenHash: hashToken(plaintextToken),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.auditLog.record({ userId: user.id, action: "api_token.create", targetType: "ApiToken", targetId: record.id });

    // The plaintext token is only ever returned here, at creation time.
    const { tokenHash: _tokenHash, ...rest } = record;
    return { ...rest, token: plaintextToken };
  }

  async revoke(user: AuthenticatedUser, id: string): Promise<void> {
    const token = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!token || (token.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("API token not found");
    }
    if (token.revokedAt) {
      throw new ForbiddenException("This token has already been revoked");
    }
    await this.prisma.apiToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    await this.auditLog.record({ userId: user.id, action: "api_token.revoke", targetType: "ApiToken", targetId: id });
  }
}
