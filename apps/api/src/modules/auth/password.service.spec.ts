import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes a password as an argon2id hash", async () => {
    const hash = await service.hash("SuperSecret123");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await service.hash("SuperSecret123");
    await expect(service.verify(hash, "SuperSecret123")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await service.hash("SuperSecret123");
    await expect(service.verify(hash, "WrongPassword")).resolves.toBe(false);
  });

  it("produces a different hash for the same password each time (random salt)", async () => {
    const a = await service.hash("SuperSecret123");
    const b = await service.hash("SuperSecret123");
    expect(a).not.toBe(b);
  });

  it("never throws on a malformed hash, just returns false", async () => {
    await expect(service.verify("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});
