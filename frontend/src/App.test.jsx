// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

let container;
let root;

function changeInput(input, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  ).set;
  valueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  apiRequest.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe("authentication form", () => {
  it("restores the existing session on mount without showing a background error", async () => {
    apiRequest.mockRejectedValue(new Error("Failed to fetch"));

    await act(async () => root.render(<App />));

    expect(apiRequest).toHaveBeenCalledWith("/auth/me");
    expect(container.textContent).toContain("Welcome back");
    expect(container.textContent).not.toContain("Failed to fetch");
  });

  it("shows a request error only after submit and clears it when the user edits", async () => {
    apiRequest.mockRejectedValue(new Error("Failed to fetch"));

    await act(async () => root.render(<App />));
    const form = container.querySelector("form");
    const email = container.querySelector('input[type="email"]');
    const password = container.querySelector('input[type="password"]');

    await act(async () => {
      changeInput(email, "person@example.com");
      changeInput(password, "secure-pass-123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/auth/login", {
      method: "POST",
      body: { email: "person@example.com", password: "secure-pass-123" },
    });
    expect(container.textContent).toContain("Failed to fetch");

    await act(async () => {
      changeInput(email, "person2@example.com");
    });

    expect(container.textContent).not.toContain("Failed to fetch");
  });

  it("only sends registration after submit and clears registration errors on edit", async () => {
    apiRequest.mockRejectedValue(new Error("Registration unavailable"));

    await act(async () => root.render(<App />));
    await act(async () => {
      container.querySelector("button[type='button']").click();
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/auth/me");

    const form = container.querySelector("form");
    const name = container.querySelector('input:not([type])');
    const email = container.querySelector('input[type="email"]');
    const password = container.querySelector('input[type="password"]');
    await act(async () => {
      changeInput(name, "Example User");
      changeInput(email, "person@example.com");
      changeInput(password, "secure-pass-123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/auth/register", {
      method: "POST",
      body: {
        name: "Example User",
        email: "person@example.com",
        password: "secure-pass-123",
      },
    });
    expect(container.textContent).toContain("Registration unavailable");

    await act(async () => {
      changeInput(name, "Another User");
    });
    expect(container.textContent).not.toContain("Registration unavailable");
  });
});

describe("organization controls", () => {
  it("creates and selects an organization through the API", async () => {
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/auth/me") return { user: { id: 11, name: "Taylor", email: "taylor@example.com" } };
      if (path === "/organizations" && options.method === "POST") {
        expect(options.body).toEqual({ name: "Studio North" });
        return { organization: { id: 21, name: "Studio North", owner_id: 11 } };
      }
      if (path === "/organizations") return { organizations: [] };
      if (path === "/workspaces") return { workspaces: [] };
      if (path === "/organizations/21/members") return { members: [{ id: 11, name: "Taylor", email: "taylor@example.com", role: "owner" }] };
      if (path === "/organizations/21/invitations") return { invitations: [] };
      throw new Error(`Unexpected API request: ${path}`);
    });

    await act(async () => root.render(<App />));
    const input = container.querySelector('input[aria-label="New organization name"]');
    await act(async () => changeInput(input, "Studio North"));
    await act(async () => container.querySelector('form').dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(container.textContent).toContain("Studio North");
    expect(container.textContent).toContain("Taylor");
    expect(apiRequest).toHaveBeenCalledWith("/organizations", { method: "POST", body: { name: "Studio North" } });
  });
});

describe("task attachments", () => {
  it("loads task files and uploads through multipart form data", async () => {
    const task = { id: 4, title: "Draft proposal", priority: "medium", status: "todo" };
    let uploaded = false;
    const attachment = {
      id: 31,
      task_id: 4,
      uploaded_by: 11,
      original_name: "brief.pdf",
      mime_type: "application/pdf",
      byte_size: 12,
    };
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/auth/me") return { user: { id: 11, name: "Taylor", email: "taylor@example.com" } };
      if (path === "/organizations") return { organizations: [{ id: 1, name: "Studio", role: "owner" }] };
      if (path === "/workspaces") return { workspaces: [{ id: 2, organization_id: 1, name: "Workspace", role: "owner" }] };
      if (path === "/organizations/1/members") return { members: [] };
      if (path === "/organizations/1/invitations") return { invitations: [] };
      if (path === "/workspaces/2/projects") return { projects: [{ id: 3, name: "Project" }] };
      if (path === "/workspaces/2/dashboard") return { dashboard: { task_count: 1, completed_tasks: 0 } };
      if (path === "/workspaces/2/teams") return { teams: [] };
      if (path === "/workspaces/2/members") return { members: [] };
      if (path === "/workspaces/2/notifications") return { notifications: [] };
      if (path === "/workspaces/2/notification-preferences") return { preferences: { assignment_enabled: true, mention_enabled: true, due_date_enabled: true } };
      if (path === "/workspaces/2/activity?limit=8") return { activity: [] };
      if (path === "/workspaces/2/projects/3/tasks?search=") return { tasks: [task] };
      if (path === "/workspaces/2/tasks/4/attachments" && options.method === "POST") {
        expect(options.body.get("file").name).toBe("brief.pdf");
        uploaded = true;
        return { attachment };
      }
      if (path === "/workspaces/2/tasks/4/attachments") return { attachments: uploaded ? [attachment] : [] };
      throw new Error(`Unexpected API request: ${path}`);
    });

    await act(async () => root.render(<App />));
    const filesButton = [...container.querySelectorAll("button")].find((button) => button.textContent.startsWith("Files"));
    await act(async () => filesButton.click());
    expect(container.textContent).not.toContain("brief.pdf");
    const fileInput = container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [new File(["%PDF-1.4"], "brief.pdf", { type: "application/pdf" })],
    });
    await act(async () => fileInput.dispatchEvent(new Event("change", { bubbles: true })));

    expect(container.textContent).toContain("brief.pdf");
    expect(apiRequest).toHaveBeenCalledWith(
      "/workspaces/2/tasks/4/attachments",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
  });
});

describe("task calendar", () => {
  it("shows a dated task and saves a rescheduled deadline", async () => {
    const now = new Date();
    const datePart = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    const startDate = datePart(now);
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const task = { id: 4, title: "Ship release", priority: "high", status: "todo", start_date: startDate, due_date: startDate };
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/auth/me") return { user: { id: 11, name: "Taylor", email: "taylor@example.com" } };
      if (path === "/organizations") return { organizations: [{ id: 1, name: "Studio", role: "owner" }] };
      if (path === "/workspaces") return { workspaces: [{ id: 2, organization_id: 1, name: "Workspace", role: "owner" }] };
      if (path === "/organizations/1/members") return { members: [] };
      if (path === "/organizations/1/invitations") return { invitations: [] };
      if (path === "/workspaces/2/projects") return { projects: [{ id: 3, name: "Project" }] };
      if (path === "/workspaces/2/dashboard") return { dashboard: { task_count: 1, completed_tasks: 0 } };
      if (path === "/workspaces/2/teams") return { teams: [] };
      if (path === "/workspaces/2/members") return { members: [] };
      if (path === "/workspaces/2/notifications") return { notifications: [] };
      if (path === "/workspaces/2/notification-preferences") return { preferences: { assignment_enabled: true, mention_enabled: true, due_date_enabled: true } };
      if (path === "/workspaces/2/activity?limit=8") return { activity: [] };
      if (path === "/workspaces/2/projects/3/tasks?search=") return { tasks: [task] };
      if (path === "/workspaces/2/tasks/4" && options.method === "PATCH") {
        return { task: { ...task, due_date: options.body.dueDate } };
      }
      throw new Error(`Unexpected API request: ${path}`);
    });

    await act(async () => root.render(<App />));
    const calendarButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Calendar");
    await act(async () => calendarButton.click());
    const startEvent = container.querySelector('button[aria-label="Start: Ship release"]');
    expect(startEvent).not.toBeNull();
    await act(async () => startEvent.click());

    const dateInputs = container.querySelectorAll('.calendar-task-dialog input[type="date"]');
    await act(async () => changeInput(dateInputs[1], datePart(nextDay)));
    await act(async () => container.querySelector(".calendar-task-dialog form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(apiRequest).toHaveBeenCalledWith("/workspaces/2/tasks/4", {
      method: "PATCH",
      body: { startDate, dueDate: datePart(nextDay) },
    });
  });
});
