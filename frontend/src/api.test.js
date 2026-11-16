import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

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
      expect.stringMatching(/\/api\/auth\/register$/),
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "person@example.com" }),
      })
    );
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
