import { validateEnv } from "./env.validation";

/** Used as the `validate` function for @nestjs/config; fails fast on boot with a clear error. */
export function validate(config: Record<string, unknown>) {
  return validateEnv(config);
}
