import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { buildPaginatedResult } from "../../common/pagination/paginate";
import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import { toPublicUser, PublicUser } from "../auth/auth.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly auditLog: AuditLogService
  ) {}

  async getById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return toPublicUser(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUser> {
    if (dto.username) {
      const clash = await this.prisma.user.findFirst({ where: { username: dto.username, NOT: { id } } });
      if (clash) throw new ConflictException("Username is already taken");
    }
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return toPublicUser(user);
  }

  async listAll(query: PaginationQueryDto) {
    const { page, pageSize, sortBy, sortOrder } = query;
    const orderableFields = new Set(["createdAt", "email", "username", "role"]);
    const orderBy = sortBy && orderableFields.has(sortBy) ? { [sortBy]: sortOrder } : { createdAt: sortOrder as "asc" | "desc" };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.user.count(),
    ]);

    return buildPaginatedResult(users.map(toPublicUser), total, page, pageSize);
  }

  async createByAdmin(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email: dto.email }, { username: dto.username }] } });
    if (existing) throw new ConflictException("Email or username is already taken");

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash, role: dto.role },
    });
    return toPublicUser(user);
  }

  async updateByAdmin(actingAdminId: string, targetId: string, dto: UpdateUserDto): Promise<PublicUser> {
    if (actingAdminId === targetId && (dto.active === false || dto.role === Role.USER)) {
      throw new ForbiddenException("Admins cannot demote or deactivate their own account");
    }
    const user = await this.prisma.user.update({ where: { id: targetId }, data: dto });
    if (dto.active === false) {
      await this.tokenService.revokeAllRefreshTokensForUser(targetId);
    }
    await this.auditLog.record({
      userId: actingAdminId,
      action: "admin.update_user",
      targetType: "User",
      targetId,
      metadata: { role: dto.role, active: dto.active },
    });
    return toPublicUser(user);
  }

  async deleteByAdmin(actingAdminId: string, targetId: string): Promise<void> {
    if (actingAdminId === targetId) {
      throw new ForbiddenException("Admins cannot delete their own account");
    }
    await this.prisma.user.delete({ where: { id: targetId } });
    await this.auditLog.record({ userId: actingAdminId, action: "admin.delete_user", targetType: "User", targetId });
  }
}
