import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiScope } from "@openmonitor/shared";
import { SCOPES_KEY } from "../decorators/scopes.decorator";
import type { AuthenticatedUser } from "./auth.guard";

/**
 * Only restricts requests authenticated via an API token. A full web session
 * (JWT) is authorized purely by role (RolesGuard) since the user is present
 * and interacting through the first-party UI, not a delegated integration.
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<ApiScope[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredScopes || requiredScopes.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user || user.authMethod !== "api_token") return true;

    const granted = user.tokenScopes ?? [];
    const hasAll = requiredScopes.every((s) => granted.includes(s));
    if (!hasAll) {
      throw new ForbiddenException(`API token is missing required scope(s): ${requiredScopes.join(", ")}`);
    }
    return true;
  }
}
