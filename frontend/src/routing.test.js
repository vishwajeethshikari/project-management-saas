import { describe, expect, it } from "vitest";
import { resolveRoute } from "./routing";

describe("application routes", () => {
  it("resolves the main pages and keeps a canonical path", () => {
    expect(resolveRoute("/dashboard")).toMatchObject({ key: "dashboard", path: "/dashboard" });
    expect(resolveRoute("/calendar/")).toMatchObject({ key: "calendar", path: "/calendar" });
  });

  it("resolves project and team details from URL parameters", () => {
    expect(resolveRoute("/projects/42")).toMatchObject({ key: "project-detail", id: "42" });
    expect(resolveRoute("/teams/8")).toMatchObject({ key: "team-detail", id: "8" });
  });

  it("returns a real not-found route for unknown paths", () => {
    expect(resolveRoute("/does-not-exist").key).toBe("not-found");
  });
});
