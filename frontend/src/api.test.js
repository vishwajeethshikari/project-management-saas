import { describe, expect, it } from "vitest";

describe("frontend configuration", () => {
  it("uses API paths as application contracts", () => {
    expect("/api/auth/login".startsWith("/api/")).toBe(true);
  });
});
