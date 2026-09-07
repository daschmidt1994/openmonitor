import argon2 from "argon2";
import { getPrismaClient } from "./index";

/**
 * Idempotent bootstrap seed. Creates the first admin user from environment
 * variables if (and only if) no admin user exists yet. Safe to run on every
 * deploy/migrate cycle.
 */
async function main() {
  const prisma = getPrismaClient();

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log("[seed] An admin user already exists, skipping bootstrap admin creation.");
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !username || !password) {
    console.log(
      "[seed] ADMIN_EMAIL / ADMIN_USERNAME / ADMIN_PASSWORD not fully set, skipping bootstrap admin creation."
    );
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const admin = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "registration_enabled" },
    update: {},
    create: { key: "registration_enabled", value: true },
  });

  console.log(`[seed] Bootstrap admin created: ${admin.email} (${admin.id})`);
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
