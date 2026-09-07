import { statusCodeMatches } from "../status-codes";

describe("statusCodeMatches", () => {
  it("defaults to the 2xx range when no spec is given", () => {
    expect(statusCodeMatches(200)).toBe(true);
    expect(statusCodeMatches(299)).toBe(true);
    expect(statusCodeMatches(300)).toBe(false);
  });

  it("matches explicit ranges", () => {
    expect(statusCodeMatches(250, "200-299")).toBe(true);
    expect(statusCodeMatches(150, "200-299")).toBe(false);
  });

  it("matches a mix of ranges and single codes", () => {
    const spec = "200-299,301,302,404";
    expect(statusCodeMatches(301, spec)).toBe(true);
    expect(statusCodeMatches(404, spec)).toBe(true);
    expect(statusCodeMatches(500, spec)).toBe(false);
  });

  it("returns false for malformed specs", () => {
    expect(statusCodeMatches(200, "abc-def")).toBe(false);
  });
});
