import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, resolveApiUrl } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// resolveApiUrl – URL normalization that prevents the "Cannot POST /auth/login"
// error that occurs when VITE_API_URL is set to a bare origin without /api.
// ---------------------------------------------------------------------------
describe("resolveApiUrl", () => {
  it("keeps /api unchanged (local Vite-proxy default)", () => {
    expect(resolveApiUrl("/api")).toBe("/api");
  });

  it("strips a trailing slash from a relative path", () => {
    expect(resolveApiUrl("/api/")).toBe("/api");
  });

  it("keeps a full URL that already includes the /api path", () => {
    expect(resolveApiUrl("https://backend.railway.app/api")).toBe(
      "https://backend.railway.app/api"
    );
  });

  it("appends /api to a bare origin so auth routes resolve correctly", () => {
    // This is the misconfiguration that causes "Cannot POST /auth/login".
    expect(resolveApiUrl("https://backend.railway.app")).toBe(
      "https://backend.railway.app/api"
    );
  });

  it("appends /api to a bare origin that has a trailing slash", () => {
    expect(resolveApiUrl("https://backend.railway.app/")).toBe(
      "https://backend.railway.app/api"
    );
  });

  it("falls back to /api when given an empty string", () => {
    expect(resolveApiUrl("")).toBe("/api");
  });

  it("falls back to /api when given undefined", () => {
    expect(resolveApiUrl(undefined)).toBe("/api");
  });
});

// ---------------------------------------------------------------------------
// apiRequest – HTTP client tests
// ---------------------------------------------------------------------------
describe("apiRequest", () => {
  it("sends JSON requests with cookies and returns JSON responses", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      apiRequest("/auth/register", {
        method: "POST",
        body: { email: "person@example.com" },
      })
    ).resolves.toEqual({ success: true });

    expect(fetch).toHaveBeenCalledWith(
      // The request must always include the /api prefix so Express can route it.
      expect.stringMatching(/\/api\/auth\/register$/),
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "person@example.com" }),
      })
    );
  });

  it("produces /api/auth/login with the default base URL", async () => {
    // Guard: the login path must always reach /api/auth/login, never /auth/login.
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetch);

    await apiRequest("/auth/login", { method: "POST", body: { email: "a@b.com", password: "pw" } });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/api\/auth\/login$/);
    expect(calledUrl).not.toMatch(/^\/auth/);
  });

  it("reports API errors with status and response details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid request data" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        })
      )
    );

    await expect(apiRequest("/auth/register")).rejects.toMatchObject({
      message: "Invalid request data",
      status: 400,
      details: { message: "Invalid request data" },
    });
  });

  it("supports empty successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest("/workspaces/1", { method: "DELETE" })).resolves.toBeNull();
  });

  it("sends multipart bodies without overriding the browser-generated boundary", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetch);
    const body = new FormData();
    body.append("file", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "brief.pdf");

    await apiRequest("/workspaces/1/tasks/2/attachments", { method: "POST", body });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/workspaces\/1\/tasks\/2\/attachments$/),
      expect.objectContaining({ body, credentials: "include", method: "POST" })
    );
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it("returns successful binary responses as blobs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(new Blob(["private file"]), { status: 200 })
    ));

    const response = await apiRequest("/workspaces/1/tasks/2/attachments/3/download", {
      responseType: "blob",
    });

    await expect(response.text()).resolves.toBe("private file");
  });
});
