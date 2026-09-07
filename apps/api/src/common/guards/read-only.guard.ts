import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "@openmonitor/shared";
import type { AuthenticatedUser } from "./auth.guard";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * A READONLY-role user can call any GET endpoint but no mutating one, with a
 * narrow allowlist for self-service account actions (logging out, changing
 * their own password) that don't grant them write access to monitors/etc.
 */
const SELF_SERVICE_ALLOWLIST = ["/api/v1/auth/logout", "/api/v1/auth/change-password"];

@Injectable()
export class ReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user || user.role !== Role.READONLY) return true;
    if (!MUTATING_METHODS.has(request.method)) return true;
    if (SELF_SERVICE_ALLOWLIST.some((path) => request.originalUrl?.startsWith(path))) return true;

    throw new ForbiddenException("Read-only accounts cannot perform this action");
  }
}
