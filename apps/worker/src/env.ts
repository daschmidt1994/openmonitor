import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  SCHEDULER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  CHECK_CONCURRENCY: z.coerce.number().int().positive().default(10),

  CHECK_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  RETENTION_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),

  PUBLIC_BASE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid worker environment configuration:\n${issues}`);
  }
  return parsed.data;
}
