import { ForbiddenException } from "@nestjs/common";
import { Role } from "@openmonitor/shared";
import { UsersService } from "./users.service";

function buildService() {
  const prisma = {
    user: {
      update: jest.fn().mockResolvedValue({
        id: "target-id",
        email: "target@test.local",
        username: "target",
        role: Role.USER,
        active: true,
        createdAt: new Date(),
      }),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  } as any;
  const passwordService = { hash: jest.fn() } as any;
  const tokenService = { revokeAllRefreshTokensForUser: jest.fn().mockResolvedValue(undefined) } as any;
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) } as any;

  return { service: new UsersService(prisma, passwordService, tokenService, auditLog), prisma, tokenService };
}

describe("UsersService.updateByAdmin", () => {
  it("prevents an admin from demoting their own role", async () => {
    const { service } = buildService();
    await expect(service.updateByAdmin("admin-1", "admin-1", { role: Role.USER })).rejects.toThrow(ForbiddenException);
  });

  it("prevents an admin from deactivating their own account", async () => {
    const { service } = buildService();
    await expect(service.updateByAdmin("admin-1", "admin-1", { active: false })).rejects.toThrow(ForbiddenException);
  });

  it("allows an admin to deactivate a different user, and revokes their sessions", async () => {
    const { service, prisma, tokenService } = buildService();
    await service.updateByAdmin("admin-1", "target-id", { active: false });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "target-id" }, data: { active: false } });
    expect(tokenService.revokeAllRefreshTokensForUser).toHaveBeenCalledWith("target-id");
  });

  it("does not revoke sessions when only the role changes (still active)", async () => {
    const { service, tokenService } = buildService();
    await service.updateByAdmin("admin-1", "target-id", { role: Role.ADMIN });
    expect(tokenService.revokeAllRefreshTokensForUser).not.toHaveBeenCalled();
  });
});

describe("UsersService.deleteByAdmin", () => {
  it("prevents an admin from deleting their own account", async () => {
    const { service } = buildService();
    await expect(service.deleteByAdmin("admin-1", "admin-1")).rejects.toThrow(ForbiddenException);
  });

  it("allows an admin to delete a different user", async () => {
    const { service, prisma } = buildService();
    await service.deleteByAdmin("admin-1", "target-id");
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "target-id" } });
  });
});
