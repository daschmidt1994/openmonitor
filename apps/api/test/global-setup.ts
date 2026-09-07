import { execSync } from "node:child_process";
import { join } from "node:path";
import { TEST_DATABASE_URL } from "./test-env";

/** Runs once before the whole e2e suite: applies migrations to the (already-existing) test database. */
export default async function globalSetup() {
  const databasePackageDir = join(__dirname, "..", "..", "..", "packages", "database");
  execSync("npx prisma migrate deploy", {
    cwd: databasePackageDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
