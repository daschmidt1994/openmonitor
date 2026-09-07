import { resolveJsonPath } from "../json-path";

describe("resolveJsonPath", () => {
  const payload = {
    data: {
      status: "ok",
      items: [{ id: 1, name: "first" }, { id: 2, name: "second" }],
    },
  };

  it("resolves nested dot paths", () => {
    expect(resolveJsonPath(payload, "data.status")).toBe("ok");
  });

  it("resolves array indices", () => {
    expect(resolveJsonPath(payload, "data.items[1].name")).toBe("second");
  });

  it("supports a leading $. prefix", () => {
    expect(resolveJsonPath(payload, "$.data.status")).toBe("ok");
  });

  it("returns undefined for a missing path", () => {
    expect(resolveJsonPath(payload, "data.missing.field")).toBeUndefined();
  });

  it("returns the whole payload for an empty path", () => {
    expect(resolveJsonPath(payload, "")).toBe(payload);
  });
});
