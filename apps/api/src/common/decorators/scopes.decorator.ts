import { SetMetadata } from "@nestjs/common";
import { ApiScope } from "@openmonitor/shared";

export const SCOPES_KEY = "scopes";
/** Required scopes when the request is authenticated via an API token. JWT (web session) auth bypasses this check. */
export const Scopes = (...scopes: ApiScope[]) => SetMetadata(SCOPES_KEY, scopes);
