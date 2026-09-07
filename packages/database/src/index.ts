import { PrismaClient } from "../generated/client";

export * from "../generated/client";

let prisma: PrismaClient | undefined;

/**
 * Returns a process-wide singleton PrismaClient. Both the API and the worker
 * process call this independently (each process gets its own singleton and
 * its own connection pool) so the monitoring engine can run fully detached
 * from the HTTP server.
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["warn", "error"]
          : ["error"],
    });
  }
  return prisma;
}
