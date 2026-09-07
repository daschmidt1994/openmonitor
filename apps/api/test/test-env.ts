export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://openmonitor:devpassword@localhost:55432/openmonitor_test?schema=public";

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = "e2e-test-secret-do-not-use-in-production-xxxx";
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL_DAYS = "30";
process.env.API_TOKEN_PREFIX = "om_";
process.env.REGISTRATION_ENABLED = "true";
process.env.NODE_ENV = "test";
