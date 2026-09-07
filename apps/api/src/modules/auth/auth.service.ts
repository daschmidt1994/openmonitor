import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, createHash } from "node:crypto";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SystemSettingsService } from "../../common/system-settings/system-settings.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import type { EnvConfig } from "../../config/env.validation";
import { PasswordService } from "./password.service";
import { TokenService, TokenPair } from "./token.service";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly systemSettings: SystemSettingsService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService<EnvConfig, true>
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const registrationEnabled = await this.systemSettings.getBool(
      "registration_enabled",
      this.config.get("REGISTRATION_ENABLED", { infer: true })
    );
    if (!registrationEnabled) {
      throw new ForbiddenException("Self-registration is currently disabled");
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException("Email or username is already taken");
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const isFirstUser = (await this.prisma.user.count()) === 0;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        role: isFirstUser ? Role.ADMIN : Role.USER,
      },
    });

    const tokens = await this.tokenService.issueTokenPair(user.id, user.role as Role, meta);
    await this.auditLog.record({
      userId: user.id,
      action: "auth.register",
      targetType: "User",
      targetId: user.id,
      ipAddress: meta.ipAddress,
    });

    return { user: toPublicUser(user), tokens };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Constant-shape response for unknown users to avoid user enumeration via timing/behavior.
    const passwordHash = user?.passwordHash ?? "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const validPassword = await this.passwordService.verify(passwordHash, dto.password);

    if (!user || !validPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (!user.active) {
      throw new ForbiddenException("This account has been deactivated");
    }

    const tokens = await this.tokenService.issueTokenPair(user.id, user.role as Role, meta);
    await this.auditLog.record({
      userId: user.id,
      action: "auth.login",
      targetType: "User",
      targetId: user.id,
      ipAddress: meta.ipAddress,
    });

    return { user: toPublicUser(user), tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    try {
      return await this.tokenService.rotateRefreshToken(refreshToken, meta);
    } catch (err) {
      throw new UnauthorizedException("Invalid, expired or already-used refresh token");
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await this.passwordService.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException("Current password is incorrect");
    }
    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokenService.revokeAllRefreshTokensForUser(userId);
    await this.auditLog.record({ userId, action: "auth.change_password", targetType: "User", targetId: userId });
  }

  /**
   * Always returns silently (no user enumeration), whether or not the email
   * exists. Returns the raw reset token only for local/dev logging purposes
   * when no email transport is configured; production deployments should
   * wire this into the notification system's email provider.
   */
  async requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return {};

    const raw = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.auditLog.record({ userId: user.id, action: "auth.request_password_reset", targetType: "User", targetId: user.id });

    return this.config.get("NODE_ENV", { infer: true }) !== "production" ? { resetToken: raw } : {};
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    await this.tokenService.revokeAllRefreshTokensForUser(record.userId);
    await this.auditLog.record({ userId: record.userId, action: "auth.reset_password", targetType: "User", targetId: record.userId });
  }
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: Date;
}

export function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role as Role,
    active: user.active,
    createdAt: user.createdAt,
  };
}
