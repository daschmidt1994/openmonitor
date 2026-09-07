import { hashToken } from "./auth.guard";

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("my-token")).toBe(hashToken("my-token"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("produces a 64-char lowercase hex SHA-256 digest", () => {
    expect(hashToken("anything")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never returns the plaintext token itself", () => {
    expect(hashToken("om_super_secret_token")).not.toContain("super_secret");
  });
});
