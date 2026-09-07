export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://openmonitor:devpassword@localhost:55432/openmonitor_test?schema=public";
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:56379";

process.env.DATABASE_URL = TEST_DATABASE_URL;
