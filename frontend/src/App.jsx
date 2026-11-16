
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { apiRequest } from "./api";

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(left, right) {
  const leftUtc = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate());
  const rightUtc = Date.UTC(right.getFullYear(), right.getMonth(), right.getDate());
  return Math.round((leftUtc - rightUtc) / 86_400_000);
}

function calendarDates(view, cursor) {
  if (view === "day") return [new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())];
  if (view === "week") {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
}

function formatDuration(seconds) {
  const minutes = Math.floor(Number(seconds || 0) / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function localDateTimeValue(value) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

// ==============================
// AUTHENTICATION SCREEN
// ==============================

function AuthScreen({ onAuthenticated, recoveryToken = "" }) {
  const [mode, setMode] = useState(recoveryToken ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setRecoveryToken] = useState(recoveryToken);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "forgot") {
        const result = await apiRequest("/auth/password/forgot", { method: "POST", body: { email } });
        setNotice(result.message);
        if (result.resetToken) {
          setRecoveryToken(result.resetToken);
          setMode("reset");
        }
        return;
      }
      if (mode === "reset") {
        await apiRequest("/auth/password/reset", { method: "POST", body: { token: resetToken, password } });
        setMode("login");
        setPassword("");
        setRecoveryToken("");
        setNotice("Password reset. Sign in with your new password.");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      await apiRequest(`/auth/${mode}`, {
        method: "POST",
        body: mode === "register" ? { name, email, password } : { email, password },
      });

      if (mode === "register") {
        setMode("login");
        setPassword("");
        setNotice("Account created. Sign in to continue.");
        return;
      }

      await onAuthenticated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="content-panel auth-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-mark">p</div>
          <span>projectflow</span>
        </div>

        <h1>
          {{ login: "Welcome back", register: "Create your account", forgot: "Recover your account", reset: "Choose a new password" }[mode]}
        </h1>

        {mode === "register" && (
          <label className="form-field">
            Name
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              required
            />
          </label>
        )}

        {mode !== "reset" && <label className="form-field">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            required
          />
        </label>}

        {(mode === "login" || mode === "register" || mode === "reset") && <label className="form-field">
          {mode === "reset" ? "New password" : "Password"}
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            required
          />
        </label>}

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}

        <button
          className="primary-button full-width"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Please wait..."
            : ({ login: "Sign in", register: "Create account", forgot: "Send recovery link", reset: "Reset password" }[mode])}
        </button>

        {(mode === "login" || mode === "register") && <button
          className="text-button"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setNotice("");
          }}
        >
          {mode === "login" ? "Create an account" : "Already have an account?"}
        </button>}
        {mode === "login" && (
          <button className="text-button" type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>
            Forgot password?
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button className="text-button" type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }}>
            Back to sign in
          </button>
        )}
      </form>
    </main>
  );
}

// ==============================
// MAIN APPLICATION
// ==============================

export default function App() {
  const initializationStarted = useRef(false);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [boardMode, setBoardMode] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [timelineMode, setTimelineMode] = useState(false);
  const [timelineDays, setTimelineDays] = useState(30);
  const [timelineCursor, setTimelineCursor] = useState(() => new Date());
  const [timelineGroupBy, setTimelineGroupBy] = useState("assignee");
  const [timelineData, setTimelineData] = useState({ tasks: [], milestones: [] });
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [calendarPeriod, setCalendarPeriod] = useState("month");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [calendarTeamFilter, setCalendarTeamFilter] = useState("");
  const [calendarTeamRoster, setCalendarTeamRoster] = useState({ workspaceId: null, teamId: null, members: [] });
  const [calendarAssigneeFilter, setCalendarAssigneeFilter] = useState("");
  const [calendarTask, setCalendarTask] = useState(null);
  const [calendarTaskDates, setCalendarTaskDates] = useState({ startDate: "", dueDate: "" });
  const [openTimeTaskId, setOpenTimeTaskId] = useState(null);
  const [taskTimeData, setTaskTimeData] = useState({});
  const [activeWorkspaceTimer, setActiveWorkspaceTimer] = useState(null);
  const [manualTimeDraft, setManualTimeDraft] = useState({ startedAt: "", endedAt: "", note: "" });
  const [editingTimeEntryId, setEditingTimeEntryId] = useState(null);
  const [timeEntryDraft, setTimeEntryDraft] = useState({ startedAt: "", endedAt: "", note: "" });
  const [showTimeReports, setShowTimeReports] = useState(false);
  const [timeReports, setTimeReports] = useState(null);
  const [showWorkload, setShowWorkload] = useState(false);
  const [workload, setWorkload] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [organizationAnalytics, setOrganizationAnalytics] = useState(null);
  const [projectAnalytics, setProjectAnalytics] = useState(null);
  const [teamProductivity, setTeamProductivity] = useState([]);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [openCommentTaskId, setOpenCommentTaskId] = useState(null);
  const [taskComments, setTaskComments] = useState({});
  const [commentDraft, setCommentDraft] = useState("");
  const [openAttachmentTaskId, setOpenAttachmentTaskId] = useState(null);
  const [taskAttachments, setTaskAttachments] = useState({});
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(null);
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [organizationInvitations, setOrganizationInvitations] = useState([]);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEditName, setOrganizationEditName] = useState("");
  const [organizationInviteEmail, setOrganizationInviteEmail] = useState("");
  const [organizationInviteRole, setOrganizationInviteRole] = useState("employee");
  const [organizationInviteUrl, setOrganizationInviteUrl] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviteUrl, setInviteUrl] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationPreferences, setNotificationPreferences] = useState({
    assignment_enabled: true,
    mention_enabled: true,
    due_date_enabled: true,
  });
  const [showInbox, setShowInbox] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [search, setSearch] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceEditName, setWorkspaceEditName] = useState("");
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectEditName, setProjectEditName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskEstimate, setTaskEstimate] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    const pollNotifications = async () => {
      try {
        const result = await apiRequest(`/workspaces/${workspaceId}/notifications`);
        if (active) setNotifications(result.notifications);
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    const timer = window.setInterval(pollNotifications, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [workspaceId]);

  // ==============================
  // LOAD WORKSPACE
  // ==============================

  async function loadWorkspace(id) {
    setWorkspaceId(id);
    setOpenTimeTaskId(null);
    setTaskTimeData({});
    setActiveWorkspaceTimer(null);
    setTimeReports(null);
    setShowTimeReports(false);
    setShowWorkload(false);
    setWorkload([]);
    setShowAnalytics(false);
    setOrganizationAnalytics(null);
    setProjectAnalytics(null);
    setTeamProductivity([]);
    setTimelineData({ tasks: [], milestones: [] });
    setError("");

    try {
      const [workspaceProjects, analytics, teamResult, memberResult, notificationResult, preferenceResult, activityResult] = await Promise.all([
        apiRequest(`/workspaces/${id}/projects`),
        apiRequest(`/workspaces/${id}/dashboard`),
        apiRequest(`/workspaces/${id}/teams`),
        apiRequest(`/workspaces/${id}/members`),
        apiRequest(`/workspaces/${id}/notifications`),
        apiRequest(`/workspaces/${id}/notification-preferences`),
        apiRequest(`/workspaces/${id}/activity?limit=8`),
      ]);

      setProjects(workspaceProjects.projects);
      setDashboard(analytics.dashboard);
      setTeams(teamResult.teams);
      setWorkspaceMembers(memberResult.members);
      setNotifications(notificationResult.notifications);
      setNotificationPreferences(preferenceResult.preferences);
      setActivityLog(activityResult.activity);
      setSelectedTeamId(teamResult.teams[0]?.id ?? "");

      const firstProject = workspaceProjects.projects[0];

      setSelectedProjectId(firstProject?.id ?? null);

      if (firstProject) {
        await refreshTasks(firstProject.id, id);
      } else {
        setTasks([]);
      }

      if (teamResult.teams[0]) {
        const result = await apiRequest(`/workspaces/${id}/teams/${teamResult.teams[0].id}/members`);
        setTeamMembers(result.members);
      } else {
        setTeamMembers([]);
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }

  // ==============================
  // LOAD TASKS
  // ==============================

  async function refreshTasks(
    projectId = selectedProjectId,
    id = workspaceId,
    searchTerm = search
  ) {
    if (!id || !projectId) {
      setTasks([]);
      return;
    }

    setIsLoadingTasks(true);
    try {
      const result = await apiRequest(
        `/workspaces/${id}/projects/${projectId}/tasks?search=${encodeURIComponent(searchTerm)}`
      );

      setTasks(result.tasks);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function refreshDashboard(id = workspaceId) {
    if (!id) {
      setDashboard(null);
      return;
    }
    const result = await apiRequest(`/workspaces/${id}/dashboard`);
    setDashboard(result.dashboard);
  }

  async function markNotificationRead(notification) {
    if (notification.is_read) return;
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/notifications/${notification.id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((item) => String(item.id) === String(notification.id) ? result.notification : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function updateNotificationPreference(field, enabled) {
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/notification-preferences`, {
        method: "PATCH",
        body: { [field]: enabled },
      });
      setNotificationPreferences(result.preferences);
    });
  }

  async function loadOrganizationMembers(id, role) {
    if (!id) { setOrganizationMembers([]); setOrganizationInvitations([]); return; }
    const memberResult = await apiRequest(`/organizations/${id}/members`);
    setOrganizationMembers(memberResult.members);
    if (["owner", "admin"].includes(role)) {
      const inviteResult = await apiRequest(`/organizations/${id}/invitations`);
      setOrganizationInvitations(inviteResult.invitations);
    } else {
      setOrganizationInvitations([]);
    }
  }

  async function selectOrganization(id) {
    setSelectedOrganizationId(id);
    setOrganizationInviteUrl("");
    setOrganizationEditName("");
    const organization = organizations.find((item) => String(item.id) === String(id));
    await loadOrganizationMembers(id, organization?.role);
    const nextWorkspace = workspaces.find((workspace) => String(workspace.organization_id) === String(id));
    if (nextWorkspace) {
      await loadWorkspace(nextWorkspace.id);
    } else {
      setWorkspaceId(null);
      setProjects([]);
      setTasks([]);
      setDashboard(null);
      setWorkspaceMembers([]);
      setTeams([]);
      setTeamMembers([]);
    }
  }

  async function createOrganization(event) {
    event.preventDefault();
    if (!organizationName.trim()) return;
    await runAction(async () => {
      const result = await apiRequest("/organizations", { method: "POST", body: { name: organizationName.trim() } });
      const organization = { ...result.organization, role: "owner", member_count: 1, workspace_count: 0 };
      setOrganizations((current) => [...current, organization]);
      setSelectedOrganizationId(organization.id);
      setOrganizationName("");
      setOrganizationMembers([{ id: user.id, name: user.name, email: user.email, role: "owner" }]);
      setOrganizationInvitations([]);
      setNotice("Organization created.");
    });
  }

  async function renameOrganization(event) {
    event.preventDefault();
    if (!selectedOrganizationId || !organizationEditName.trim()) return;
    await runAction(async () => {
      const result = await apiRequest(`/organizations/${selectedOrganizationId}`, { method: "PATCH", body: { name: organizationEditName.trim() } });
      setOrganizations((current) => current.map((item) => String(item.id) === String(selectedOrganizationId) ? { ...item, ...result.organization } : item));
      setOrganizationEditName("");
      setNotice("Organization settings saved.");
    });
  }

  async function inviteOrganizationMember(event) {
    event.preventDefault();
    if (!selectedOrganizationId || !organizationInviteEmail.trim()) return;
    await runAction(async () => {
      const result = await apiRequest(`/organizations/${selectedOrganizationId}/invitations`, {
        method: "POST",
        body: { email: organizationInviteEmail.trim(), role: organizationInviteRole },
      });
      setOrganizationInvitations((current) => [result.invitation, ...current]);
      setOrganizationInviteUrl(result.inviteUrl);
      setOrganizationInviteEmail("");
      setNotice(result.delivery === "email" ? "Organization invitation sent." : "Organization invitation link created.");
    });
  }

  async function removeOrganizationMember(member) {
    await runAction(async () => {
      await apiRequest(`/organizations/${selectedOrganizationId}/members/${member.id}`, { method: "DELETE" });
      setOrganizationMembers((current) => current.filter((item) => String(item.id) !== String(member.id)));
      setOrganizations((current) => current.map((item) => String(item.id) === String(selectedOrganizationId) ? { ...item, member_count: Math.max(0, (item.member_count || 1) - 1) } : item));
      setNotice(`${member.name} removed from the organization.`);
    });
  }

  async function manageOrganizationInvitation(invitation, action) {
    await runAction(async () => {
      const path = `/organizations/${selectedOrganizationId}/invitations/${invitation.id}/${action}`;
      const result = await apiRequest(path, { method: action === "resend" ? "POST" : "PATCH" });
      if (action === "resend") setOrganizationInviteUrl(result.inviteUrl);
      else setOrganizationInvitations((current) => current.map((item) => String(item.id) === String(invitation.id) ? { ...item, status: "revoked" } : item));
    });
  }

  // ==============================
  // INITIALIZE APPLICATION
  // ==============================

  async function initialize() {
    setIsInitializing(true);
    setError("");

    try {
      const me = await apiRequest("/auth/me");
      setUser(me.user);

      const inviteToken = new URLSearchParams(window.location.search).get("invite");
      if (inviteToken) {
        try {
          const invitation = await apiRequest("/workspaces/invitations/accept", {
            method: "POST",
            body: { token: inviteToken },
          });
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          setNotice(`You joined workspace ${invitation.workspaceId}.`);
        } catch (inviteError) {
          setError(inviteError.message);
        }
      }

      const organizationInviteToken = new URLSearchParams(window.location.search).get("organizationInvite");
      if (organizationInviteToken) {
        try {
          await apiRequest("/organizations/invitations/accept", {
            method: "POST",
            body: { token: organizationInviteToken },
          });
          const url = new URL(window.location.href);
          url.searchParams.delete("organizationInvite");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          setNotice("You joined the organization.");
        } catch (inviteError) {
          setError(inviteError.message);
        }
      }

      const [organizationResult, workspaceResult] = await Promise.all([
        apiRequest("/organizations"),
        apiRequest("/workspaces"),
      ]);
      setOrganizations(organizationResult.organizations);
      setWorkspaces(workspaceResult.workspaces);
      const initialOrganizationId = workspaceResult.workspaces[0]?.organization_id ?? organizationResult.organizations[0]?.id ?? null;
      setSelectedOrganizationId(initialOrganizationId);
      const initialOrganization = organizationResult.organizations.find((item) => String(item.id) === String(initialOrganizationId));
      if (initialOrganizationId) await loadOrganizationMembers(initialOrganizationId, initialOrganization?.role);

      const initialWorkspace = workspaceResult.workspaces.find((item) => String(item.organization_id) === String(initialOrganizationId));
      if (initialWorkspace) {
        await loadWorkspace(initialWorkspace.id);
      } else {
        setWorkspaceId(null);
        setProjects([]);
        setTasks([]);
        setDashboard(null);
        setSelectedProjectId(null);
      }
    } catch (requestError) {
      setUser(null);
      setOrganizations([]);
      setSelectedOrganizationId(null);
      setWorkspaces([]);
      setWorkspaceId(null);
      setProjects([]);
      setTasks([]);
      setDashboard(null);

      if (requestError.status !== 401) {
        setError(requestError.message);
      }
      throw requestError;
    } finally {
      setIsInitializing(false);
    }
  }

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;
    initialize().catch(() => {});
    // The ref makes initialization one-shot; its callback should not rerun on local state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (previewAttachment?.url) URL.revokeObjectURL(previewAttachment.url);
  }, [previewAttachment]);

  useEffect(() => {
    if (!workspaceId || !calendarTeamFilter) return;
    apiRequest(`/workspaces/${workspaceId}/teams/${calendarTeamFilter}/members`)
      .then((result) => setCalendarTeamRoster({
        workspaceId: String(workspaceId),
        teamId: String(calendarTeamFilter),
        members: result.members,
      }))
      .catch((requestError) => setError(requestError.message));
  }, [calendarTeamFilter, workspaceId]);

  // ==============================
  // LOGIN SUCCESS HANDLER
  // ==============================

  async function handleAuthenticated() {
    await initialize();
  }

  async function runAction(action) {
    setIsSaving(true);
    setError("");
    try {
      await action();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  // ==============================
  // CREATE WORKSPACE
  // ==============================

  async function createWorkspace(event) {
    event.preventDefault();
    if (!workspaceName.trim()) return;

    return runAction(async () => {
      const result = await apiRequest("/workspaces", {
        method: "POST",
        body: {
          name: workspaceName.trim(),
          ...(selectedOrganizationId ? { organizationId: selectedOrganizationId } : {}),
        },
      });

      setWorkspaces((current) => [
        ...current,
        {
          ...result.workspace,
          role: "owner",
        },
      ]);

      setWorkspaceName("");
      setSelectedOrganizationId(result.workspace.organization_id);
      const organizationsResult = await apiRequest("/organizations");
      setOrganizations(organizationsResult.organizations);
      const createdOrganization = organizationsResult.organizations.find((item) => String(item.id) === String(result.workspace.organization_id));
      if (createdOrganization) await loadOrganizationMembers(createdOrganization.id, createdOrganization.role);
      await loadWorkspace(result.workspace.id);
    });
  }

  async function createInvitation(event) {
    event.preventDefault();
    if (!workspaceId || !inviteEmail.trim()) return;
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        body: { email: inviteEmail.trim(), role: inviteRole },
      });
      setInviteEmail("");
      setInviteUrl(result.inviteUrl);
      setNotice(result.delivery === "email" ? "Invitation sent." : "Invitation link created. Share it with the invited member.");
    });
  }

  async function createTeam(event) {
    event.preventDefault();
    if (!workspaceId || !teamName.trim()) return;
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/teams`, {
        method: "POST",
        body: { name: teamName.trim(), managerId: user.id },
      });
      setTeams((current) => [...current, { ...result.team, member_count: 1 }]);
      setSelectedTeamId(result.team.id);
      setTeamName("");
      const members = await apiRequest(`/workspaces/${workspaceId}/teams/${result.team.id}/members`);
      setTeamMembers(members.members);
    });
  }

  async function loadTeamMembers(id) {
    setSelectedTeamId(id);
    if (!id || !workspaceId) { setTeamMembers([]); return { members: [] }; }
    const result = await apiRequest(`/workspaces/${workspaceId}/teams/${id}/members`);
    setTeamMembers(result.members);
    return result;
  }

  async function addTeamMember(event) {
    event.preventDefault();
    if (!workspaceId || !selectedTeamId || !selectedTeamMemberId) return;
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/teams/${selectedTeamId}/members`, {
        method: "POST",
        body: { userId: Number(selectedTeamMemberId), role: "employee" },
      });
      const result = await loadTeamMembers(selectedTeamId);
      setTeams((current) => current.map((team) => String(team.id) === String(selectedTeamId)
        ? { ...team, member_count: result.members.length } : team));
      setSelectedTeamMemberId("");
    });
  }

  async function deleteWorkspace(workspace) {
    return runAction(async () => {
      await apiRequest(`/workspaces/${workspace.id}`, { method: "DELETE" });
      const remainingWorkspaces = workspaces.filter(
        (item) => item.id !== workspace.id
      );
      setWorkspaces(remainingWorkspaces);

      if (remainingWorkspaces[0]) {
        await loadWorkspace(remainingWorkspaces[0].id);
      } else {
        setWorkspaceId(null);
        setProjects([]);
        setTasks([]);
        setDashboard(null);
        setSelectedProjectId(null);
      setOrganizationMembers([]);
      setOrganizationInvitations([]);
      }
    });
  }

  async function updateWorkspace(event, workspace) {
    event.preventDefault();
    if (!workspaceEditName.trim() || workspaceEditName.trim() === workspace.name) return;

    return runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspace.id}`, {
        method: "PATCH",
        body: { name: workspaceEditName.trim() },
      });
      setWorkspaces((current) =>
        current.map((item) =>
          item.id === workspace.id ? { ...item, ...result.workspace } : item
        )
      );
      setEditingWorkspaceId(null);
      setWorkspaceEditName("");
    });
  }

  // ==============================
  // CREATE PROJECT
  // ==============================

  async function createProject(event) {
    event.preventDefault();

    if (!projectName.trim() || !workspaceId) return;

    await runAction(async () => {
      const result = await apiRequest(
        `/workspaces/${workspaceId}/projects`,
        {
          method: "POST",
          body: {
            name: projectName.trim(),
          },
        }
      );

      setProjects((current) => [
        result.project,
        ...current,
      ]);

      setSelectedProjectId(result.project.id);
      setProjectName("");

      await refreshTasks(result.project.id);
      await refreshDashboard();
    });
  }

  async function updateProject(event, project) {
    event.preventDefault();
    if (!projectEditName.trim() || projectEditName.trim() === project.name) return;

    await runAction(async () => {
      const result = await apiRequest(
        `/workspaces/${workspaceId}/projects/${project.id}`,
        { method: "PATCH", body: { name: projectEditName.trim() } }
      );
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? result.project : item))
      );
      setEditingProjectId(null);
      setProjectEditName("");
    });
  }

  async function deleteProject(project) {
    return runAction(async () => {
      await apiRequest(
        `/workspaces/${workspaceId}/projects/${project.id}`,
        { method: "DELETE" }
      );
      await loadWorkspace(workspaceId);
    });
  }

  // ==============================
  // CREATE TASK
  // ==============================

  async function createTask(event) {
    event.preventDefault();

    if (!taskTitle.trim() || !selectedProjectId) return;

    await runAction(async () => {
      await apiRequest(
        `/workspaces/${workspaceId}/tasks`,
        {
          method: "POST",
          body: {
            projectId: selectedProjectId,
            title: taskTitle.trim(),
            ...(taskEstimate !== "" ? { estimatedMinutes: Number(taskEstimate) } : {}),
          },
        }
      );

      setTaskTitle("");
      setTaskEstimate("");

      await refreshTasks(selectedProjectId);
      await refreshDashboard();
    });
  }

  // ==============================
  // UPDATE TASK STATUS
  // ==============================

  async function updateTask(task, status) {
    await runAction(async () => {
      await apiRequest(
        `/workspaces/${workspaceId}/tasks/${task.id}`,
        {
          method: "PATCH",
          body: {
            status,
          },
        }
      );

      await refreshTasks(selectedProjectId);
      await refreshDashboard();
    });
  }

  async function deleteTask(task) {
    return runAction(async () => {
      await apiRequest(
        `/workspaces/${workspaceId}/tasks/${task.id}`,
        { method: "DELETE" }
      );
      await refreshTasks(selectedProjectId);
      await refreshDashboard();
    });
  }

  async function toggleTaskComments(task) {
    if (String(openCommentTaskId) === String(task.id)) {
      setOpenCommentTaskId(null);
      setCommentDraft("");
      return;
    }
    setOpenCommentTaskId(task.id);
    setCommentDraft("");
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/comments`);
      setTaskComments((current) => ({ ...current, [task.id]: result.comments }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addTaskComment(event, task) {
    event.preventDefault();
    if (!commentDraft.trim()) return;
    const body = commentDraft.trim();
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/comments`, {
        method: "POST",
        body: { body },
      });
      setTaskComments((current) => ({ ...current, [task.id]: [...(current[task.id] || []), result.comment] }));
      setCommentDraft("");
    });
  }

  async function toggleTaskAttachments(task) {
    if (String(openAttachmentTaskId) === String(task.id)) {
      setOpenAttachmentTaskId(null);
      return;
    }
    setOpenAttachmentTaskId(task.id);
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/attachments`);
      setTaskAttachments((current) => ({ ...current, [task.id]: result.attachments }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function uploadTaskAttachment(event, task) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/attachments`);
      setTaskAttachments((current) => ({ ...current, [task.id]: result.attachments }));
      setOpenAttachmentTaskId(task.id);
    });
  }

  async function retrieveTaskAttachment(task, attachment, preview = false) {
    await runAction(async () => {
      const blob = await apiRequest(
        `/workspaces/${workspaceId}/tasks/${task.id}/attachments/${attachment.id}/download`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(blob);
      if (preview && ["application/pdf", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(attachment.mime_type)) {
        setPreviewAttachment({ ...attachment, url });
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.original_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  async function deleteTaskAttachment(task, attachment) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      setTaskAttachments((current) => ({
        ...current,
        [task.id]: current[task.id].filter((item) => String(item.id) !== String(attachment.id)),
      }));
    });
  }

  function openCalendarTask(task) {
    setCalendarTask(task);
    setCalendarTaskDates({
      startDate: task.start_date ? String(task.start_date).slice(0, 10) : "",
      dueDate: task.due_date ? String(task.due_date).slice(0, 10) : "",
    });
  }

  async function saveCalendarTaskDates(event) {
    event.preventDefault();
    if (!calendarTask) return;
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${calendarTask.id}`, {
        method: "PATCH",
        body: {
          startDate: calendarTaskDates.startDate || null,
          dueDate: calendarTaskDates.dueDate || null,
        },
      });
      setTasks((current) => current.map((task) => String(task.id) === String(result.task.id) ? result.task : task));
      setCalendarTask(result.task);
      setNotice("Task dates updated.");
    });
  }

  async function loadTaskTime(taskId) {
    const [result, active] = await Promise.all([
      apiRequest(`/workspaces/${workspaceId}/tasks/${taskId}/time-entries`),
      apiRequest(`/workspaces/${workspaceId}/time-entries/active`),
    ]);
    setTaskTimeData((current) => ({ ...current, [taskId]: result }));
    setActiveWorkspaceTimer(active.activeTimers[0] || null);
  }

  async function toggleTaskTime(task) {
    if (String(openTimeTaskId) === String(task.id)) {
      setOpenTimeTaskId(null);
      return;
    }
    setOpenTimeTaskId(task.id);
    setManualTimeDraft({ startedAt: "", endedAt: "", note: "" });
    try {
      await loadTaskTime(task.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function startTaskTimer(task) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/time-entries/start`, {
        method: "POST",
        body: { taskId: task.id },
      });
      await loadTaskTime(task.id);
    });
  }

  async function stopTaskTimer(task, entry) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/time-entries/${entry.id}/stop`, {
        method: "POST",
      });
      await loadTaskTime(task.id);
    });
  }

  async function createManualTimeEntry(event, task) {
    event.preventDefault();
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/time-entries`, {
        method: "POST",
        body: {
          startedAt: new Date(manualTimeDraft.startedAt).toISOString(),
          endedAt: new Date(manualTimeDraft.endedAt).toISOString(),
          note: manualTimeDraft.note.trim() || null,
        },
      });
      setManualTimeDraft({ startedAt: "", endedAt: "", note: "" });
      await loadTaskTime(task.id);
    });
  }

  function beginEditTimeEntry(entry) {
    setEditingTimeEntryId(entry.id);
    setTimeEntryDraft({
      startedAt: localDateTimeValue(entry.started_at),
      endedAt: localDateTimeValue(entry.ended_at),
      note: entry.note || "",
    });
  }

  async function updateTimeEntry(event, task, entry) {
    event.preventDefault();
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/time-entries/${entry.id}`, {
        method: "PATCH",
        body: {
          startedAt: new Date(timeEntryDraft.startedAt).toISOString(),
          endedAt: new Date(timeEntryDraft.endedAt).toISOString(),
          note: timeEntryDraft.note.trim() || null,
        },
      });
      setEditingTimeEntryId(null);
      await loadTaskTime(task.id);
    });
  }

  async function deleteTimeEntry(task, entry) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}/time-entries/${entry.id}`, {
        method: "DELETE",
      });
      await loadTaskTime(task.id);
    });
  }

  async function toggleTimeReports() {
    if (showTimeReports) {
      setShowTimeReports(false);
      return;
    }
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/time-reports`);
      setTimeReports(result);
      setShowTimeReports(true);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleWorkload() {
    if (showWorkload) {
      setShowWorkload(false);
      return;
    }
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/workload`);
      setWorkload(result.workload);
      setShowWorkload(true);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleAnalytics() {
    if (showAnalytics) {
      setShowAnalytics(false);
      return;
    }
    try {
      const [organizationResult, projectResult, teamResults] = await Promise.all([
        apiRequest(`/organizations/${selectedOrganizationId}/analytics`),
        selectedProjectId
          ? apiRequest(`/workspaces/${workspaceId}/projects/${selectedProjectId}/analytics`)
          : Promise.resolve(null),
        Promise.all(teams.map(async (team) => ({
          team,
          result: await apiRequest(`/workspaces/${workspaceId}/teams/${team.id}/productivity`),
        }))),
      ]);
      setOrganizationAnalytics(organizationResult);
      setProjectAnalytics(projectResult);
      setTeamProductivity(teamResults);
      setShowAnalytics(true);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function exportAnalyticsCsv() {
    await runAction(async () => {
      const blob = await apiRequest(`/workspaces/${workspaceId}/analytics/export.csv`, { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "workspace-analytics.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  async function loadTimeline(projectId = selectedProjectId) {
    if (!projectId || !workspaceId) {
      setTimelineData({ tasks: [], milestones: [] });
      return;
    }
    const result = await apiRequest(`/workspaces/${workspaceId}/projects/${projectId}/timeline`);
    setTimelineData({ tasks: result.tasks, milestones: result.milestones });
  }

  async function showTimeline() {
    if (timelineMode) {
      setTimelineMode(false);
      return;
    }
    setTimelineMode(true);
    setCalendarMode(false);
    setBoardMode(false);
    try {
      await loadTimeline();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createMilestone(event) {
    event.preventDefault();
    if (!milestoneName.trim() || !selectedProjectId) return;
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/projects/${selectedProjectId}/milestones`, {
        method: "POST",
        body: { name: milestoneName.trim(), dueDate: milestoneDueDate || null },
      });
      setMilestoneName("");
      setMilestoneDueDate("");
      await loadTimeline();
    });
  }

  async function toggleMilestone(milestone) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/projects/${selectedProjectId}/milestones/${milestone.id}`, {
        method: "PATCH",
        body: { isCompleted: !milestone.completed_at },
      });
      await loadTimeline();
    });
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return;
    const { type, item } = deleteConfirmation;
    const deleted =
      type === "workspace"
        ? await deleteWorkspace(item)
        : type === "project"
          ? await deleteProject(item)
          : await deleteTask(item);
    if (deleted) setDeleteConfirmation(null);
  }

  // ==============================
  // LOGOUT
  // ==============================

  async function logout() {
    let logoutError;
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (requestError) {
      logoutError = requestError;
    }
    setUser(null);
    setOrganizations([]);
    setSelectedOrganizationId(null);
    setOrganizationMembers([]);
    setOrganizationInvitations([]);
    setWorkspaces([]);
    setWorkspaceId(null);
    setProjects([]);
    setTasks([]);
    setDashboard(null);
    setSelectedProjectId(null);
    setSearch("");
    setError(logoutError ? logoutError.message : "");
  }

  // ==============================
  // DASHBOARD COMPLETION
  // ==============================

  const completion = useMemo(() => {
    if (!dashboard?.task_count) return 0;

    return Math.round(
      (dashboard.completed_tasks / dashboard.task_count) * 100
    );
  }, [dashboard]);
  const selectedWorkspace = workspaces.find(
    (workspace) => String(workspace.id) === String(workspaceId)
  );
  const selectedOrganization = organizations.find(
    (organization) => String(organization.id) === String(selectedOrganizationId)
  );
  const organizationWorkspaces = workspaces.filter(
    (workspace) => String(workspace.organization_id) === String(selectedOrganizationId)
  );
  const calendarDays = calendarDates(calendarPeriod, calendarCursor);
  const currentCalendarTeamRoster =
    calendarTeamRoster.workspaceId === String(workspaceId) &&
    calendarTeamRoster.teamId === String(calendarTeamFilter)
      ? calendarTeamRoster.members
      : [];
  const calendarTeamMemberIds = new Set(currentCalendarTeamRoster.map((member) => String(member.id)));
  const calendarTasks = tasks.filter((task) =>
    (!calendarAssigneeFilter || String(task.assignee_id || "") === calendarAssigneeFilter) &&
    (!calendarTeamFilter || calendarTeamMemberIds.has(String(task.assignee_id || "")))
  );
  const calendarTitle = calendarPeriod === "day"
    ? calendarCursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : calendarPeriod === "week"
      ? `${calendarDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${calendarDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const timelineStartDate = new Date(timelineCursor.getFullYear(), timelineCursor.getMonth(), timelineCursor.getDate());
  const timelineDateLabels = Array.from({ length: timelineDays }, (_, index) =>
    new Date(timelineStartDate.getFullYear(), timelineStartDate.getMonth(), timelineStartDate.getDate() + index)
  );
  const timelineGroups = timelineData.tasks.reduce((groups, task) => {
    const key = timelineGroupBy === "status"
      ? task.status.replace("_", " ")
      : task.assignee_name || "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
    return groups;
  }, new Map());
  const recoveryToken = new URLSearchParams(window.location.search).get("reset") || "";

  // ==============================
  // AUTHENTICATION CHECK
  // ==============================

  if (isInitializing) {
    return <main className="auth-page">Connecting to Projectflow...</main>;
  }

  if (recoveryToken) {
    return <AuthScreen onAuthenticated={handleAuthenticated} recoveryToken={recoveryToken} />;
  }

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        recoveryToken={recoveryToken}
      />
    );
  }

  // ==============================
  // MAIN DASHBOARD UI
  // ==============================

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">p</div>
          <span>projectflow</span>
        </div>

        <div className="workspace-label">ORGANIZATION</div>
        <select className="status-filter" aria-label="Organization" value={selectedOrganizationId || ""} onChange={(event) => selectOrganization(event.target.value)}>
          {organizations.length === 0 && <option value="">No organizations</option>}
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
        </select>
        <form className="sidebar-workspace-form" onSubmit={createOrganization}>
          <input aria-label="New organization name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Organization name" required />
          <button className="text-button" type="submit" disabled={isSaving}>＋ New organization</button>
        </form>

        <div className="workspace-label">WORKSPACE</div>

        <select
          className="status-filter"
          value={workspaceId || ""}
          disabled={organizationWorkspaces.length === 0}
          onChange={(event) =>
            loadWorkspace(event.target.value)
          }
        >
          {organizationWorkspaces.length === 0 && (
            <option value="">No workspaces yet</option>
          )}
          {organizationWorkspaces.map((workspace) => (
            <option
              key={workspace.id}
              value={workspace.id}
            >
              {workspace.name}
            </option>
          ))}
        </select>

        {selectedOrganizationId && <form className="sidebar-workspace-form" onSubmit={createWorkspace}>
          <input
            aria-label="New workspace name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Workspace name"
            required
          />
          <button
            className="text-button"
            type="submit"
            disabled={isSaving}
          >
            ＋ New workspace
          </button>
        </form>}
        {["owner", "admin"].includes(selectedWorkspace?.role) && (
          <form className="sidebar-workspace-form invite-form" onSubmit={createInvitation}>
            <label htmlFor="invite-email">Invite member</label>
            <input id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" required />
            <select aria-label="Invitation role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
              <option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="viewer">Viewer</option>
            </select>
            <button className="text-button" type="submit" disabled={isSaving}>Create invitation</button>
            {inviteUrl && <><a className="invite-link" href={inviteUrl} target="_blank" rel="noreferrer">Open invitation link</a><input aria-label="Invitation link to share" value={inviteUrl} readOnly onFocus={(event) => event.target.select()} /></>}
          </form>
        )}
        {selectedWorkspace?.role === "owner" && (
          <button
            className="text-button danger-button"
            onClick={() => setDeleteConfirmation({
              type: "workspace",
              item: selectedWorkspace,
            })}
            disabled={isSaving}
          >
            Delete workspace
          </button>
        )}
        {["owner", "admin"].includes(selectedWorkspace?.role) && (
          editingWorkspaceId === selectedWorkspace.id ? (
            <form
              className="sidebar-workspace-form"
              onSubmit={(event) => updateWorkspace(event, selectedWorkspace)}
            >
              <input
                aria-label="Workspace name"
                value={workspaceEditName}
                onChange={(event) => setWorkspaceEditName(event.target.value)}
                required
              />
              <button className="text-button" type="submit" disabled={isSaving}>
                Save name
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setEditingWorkspaceId(null);
                  setWorkspaceEditName("");
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="text-button"
              onClick={() => {
                setEditingWorkspaceId(selectedWorkspace.id);
                setWorkspaceEditName(selectedWorkspace.name);
              }}
              disabled={isSaving}
            >
              Rename workspace
            </button>
          )
        )}

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">
              {user.name?.[0]}
            </div>

            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <button
            className="text-button"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="topbar">
          <div className="breadcrumb">
            <strong>Workspace dashboard</strong>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button inbox-toggle" type="button" aria-expanded={showInbox} onClick={() => setShowInbox((current) => !current)}>
              Inbox{notifications.filter((item) => !item.is_read).length > 0 ? ` · ${notifications.filter((item) => !item.is_read).length}` : ""}
            </button>
            {showInbox && <section className="inbox-panel" aria-label="Notification inbox">
              <header><strong>Inbox</strong><button className="text-button" type="button" onClick={() => setShowInbox(false)}>Close</button></header>
              <div className="notification-preferences">
                <strong>Preferences</strong>
                {[
                  ["assignment_enabled", "assignmentEnabled", "Assignments"],
                  ["mention_enabled", "mentionEnabled", "Mentions"],
                  ["due_date_enabled", "dueDateEnabled", "Due-date reminders"],
                ].map(([column, field, label]) => (
                  <label key={column}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences[column]}
                      onChange={(event) => updateNotificationPreference(field, event.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {notifications.length === 0 ? <p className="empty-state">You’re all caught up.</p> : notifications.map((notification) => (
                <button className={`inbox-item ${notification.is_read ? "read" : "unread"}`} type="button" key={notification.id} onClick={() => markNotificationRead(notification)}>
                  <span>{notification.message}</span><small>{new Date(notification.created_at).toLocaleString()}</small>
                </button>
              ))}
            </section>}
          </div>
        </header>

        <section className="page-container">

          {/* PAGE HEADING */}

          <div className="page-heading">
            <div>
              <div className="eyebrow">
                WORKSPACE OVERVIEW
              </div>

              <h1>Good work starts here.</h1>
            </div>
          </div>

          {error && (
            <p className="form-error">{error}</p>
          )}
          {notice && <p className="form-notice" role="status">{notice}</p>}

          {selectedOrganization && <section className="content-panel organization-panel">
            <div className="section-heading"><div><h2>{selectedOrganization.name}</h2><p>Organization settings, members, and invitations.</p></div><span>{selectedOrganization.role}</span></div>
            {['owner', 'admin'].includes(selectedOrganization.role) && <>
              <form className="project-toolbar" onSubmit={renameOrganization}>
                <input aria-label="Organization name" value={organizationEditName} onChange={(event) => setOrganizationEditName(event.target.value)} placeholder={selectedOrganization.name} />
                <button className="secondary-button" type="submit" disabled={isSaving || !organizationEditName.trim()}>Save organization name</button>
              </form>
              <form className="project-toolbar" onSubmit={inviteOrganizationMember}>
                <input type="email" aria-label="Invite organization member email" value={organizationInviteEmail} onChange={(event) => setOrganizationInviteEmail(event.target.value)} placeholder="teammate@company.com" required />
                <select aria-label="Organization invitation role" value={organizationInviteRole} onChange={(event) => setOrganizationInviteRole(event.target.value)}><option value="employee">Employee</option><option value="manager">Manager</option></select>
                <button className="secondary-button" type="submit" disabled={isSaving}>Invite member</button>
              </form>
              {organizationInviteUrl && <label className="form-field">Invitation link<input aria-label="Organization invitation link" value={organizationInviteUrl} readOnly onFocus={(event) => event.target.select()} /></label>}
            </>}
            <h3>Members</h3>
            {organizationMembers.length === 0 ? <p className="empty-state">No organization members found.</p> : organizationMembers.map((member) => <div className="member-row" key={member.id}><span><strong>{member.name}</strong><small>{member.email}</small></span><span>{member.role}</span>{['owner', 'admin'].includes(selectedOrganization.role) && member.role !== 'owner' && String(member.id) !== String(user.id) && <button className="text-button danger-button" type="button" onClick={() => removeOrganizationMember(member)} disabled={isSaving}>Remove</button>}</div>)}
            {['owner', 'admin'].includes(selectedOrganization.role) && <><h3>Invitations</h3>{organizationInvitations.length === 0 ? <p className="empty-state">No pending invitations.</p> : organizationInvitations.map((invitation) => <div className="member-row" key={invitation.id}><span><strong>{invitation.email}</strong><small>{invitation.role} · {invitation.status}</small></span>{invitation.status === 'pending' && <><button className="text-button" type="button" onClick={() => manageOrganizationInvitation(invitation, 'resend')} disabled={isSaving}>Resend</button><button className="text-button danger-button" type="button" onClick={() => manageOrganizationInvitation(invitation, 'revoke')} disabled={isSaving}>Revoke</button></>}</div>)}</>}
          </section>}

          {/* DASHBOARD CARDS */}

          <div className="overview-grid">

            <article className="overview-card">
              <span>Total projects</span>

              <div className="metric-value">
                {dashboard?.project_count ?? 0}
              </div>
            </article>

            <article className="overview-card">
              <span>Active tasks</span>

              <div className="metric-value">
                {dashboard
                  ? dashboard.task_count -
                    dashboard.completed_tasks
                  : 0}
              </div>
            </article>

            <article className="overview-card">
              <span>Completion</span>

              <div className="metric-value">
                {completion}%
              </div>
            </article>

          </div>

          <section className="content-panel activity-panel">
            <div className="section-heading"><div><h2>Recent activity</h2><p>Changes and collaboration across this workspace.</p></div></div>
            {activityLog.length === 0 ? <p className="empty-state">Workspace activity will appear here.</p> : activityLog.slice(0, 8).map((item) => (
              <article className="activity-item" key={item.id}>
                <span className="activity-dot" aria-hidden="true" />
                <p><strong>{item.actor_name || "A teammate"}</strong> {item.action} {item.resource_type}{item.details?.title ? `: ${item.details.title}` : ""}</p>
                <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
              </article>
            ))}
          </section>

          {/* PROJECT MANAGEMENT */}

          <section className="content-panel">

            <div className="section-heading">
              <div>
                <h2>Projects</h2>
              </div>
            </div>

            <form
              className="project-toolbar"
              onSubmit={createProject}
            >
              <input
                value={projectName}
                onChange={(event) =>
                  setProjectName(event.target.value)
                }
                placeholder="New project name"
              />

              <button
                className="primary-button"
                type="submit"
                disabled={!workspaceId || !["owner", "admin", "manager"].includes(selectedWorkspace?.role) || isSaving}
              >
                {isSaving ? "Saving..." : "Add project"}
              </button>
            </form>

            <div className="project-toolbar">

              {projects.map((project) => (
                <div className="project-list-item" key={project.id}>
                  {editingProjectId === project.id ? (
                    <form
                      className="project-edit-form"
                      onSubmit={(event) => updateProject(event, project)}
                    >
                      <input
                        aria-label="Project name"
                        value={projectEditName}
                        onChange={(event) => setProjectEditName(event.target.value)}
                        required
                      />
                      <button className="text-button" type="submit" disabled={isSaving}>
                        Save
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => {
                          setEditingProjectId(null);
                          setProjectEditName("");
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        className={`secondary-button ${
                          Number(selectedProjectId) === Number(project.id)
                            ? "active"
                            : ""
                        }`}
                        disabled={isSaving}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          refreshTasks(project.id).catch((requestError) =>
                            setError(requestError.message)
                          );
                          if (timelineMode) loadTimeline(project.id).catch((requestError) => setError(requestError.message));
                        }}
                      >
                        {project.name}
                      </button>
                      {["owner", "admin", "manager"].includes(selectedWorkspace?.role) && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setEditingProjectId(project.id);
                            setProjectEditName(project.name);
                          }}
                          disabled={isSaving}
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                  {["owner", "admin"].includes(selectedWorkspace?.role) && (
                    <button
                      className="text-button danger-button"
                      onClick={() => setDeleteConfirmation({
                        type: "project",
                        item: project,
                      })}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}

            </div>
          </section>

          <section className="content-panel">
            <div className="section-heading"><div><h2>Teams</h2><p>Organize workspace members and assign team ownership.</p></div></div>
            {selectedWorkspace && ["owner", "admin", "manager"].includes(selectedWorkspace.role) && (
              <form className="project-toolbar" onSubmit={createTeam}>
                <input aria-label="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="New team name" required />
                <button className="primary-button" type="submit" disabled={isSaving}>Create team</button>
              </form>
            )}
            {teams.length === 0 ? <p className="empty-state">No teams yet. Create a team to group workspace members.</p> : (
              <div className="team-management">
                <label className="form-field">Team
                  <select value={selectedTeamId} onChange={(event) => loadTeamMembers(event.target.value).catch((requestError) => setError(requestError.message))}>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.member_count} members</option>)}
                  </select>
                </label>
                <div className="team-member-list">
                  {teamMembers.map((member) => (
                    <div className="team-member-item" key={member.id}>
                      <span><strong>{member.name}</strong><small>{member.email} · {member.role}</small></span>
                      {["owner", "admin", "manager"].includes(selectedWorkspace?.role) && (
                        <button className="text-button danger-button" type="button" disabled={isSaving} onClick={() => runAction(async () => {
                          await apiRequest(`/workspaces/${workspaceId}/teams/${selectedTeamId}/members/${member.id}`, { method: "DELETE" });
                          const result = await loadTeamMembers(selectedTeamId);
                          setTeams((current) => current.map((team) => String(team.id) === String(selectedTeamId) ? { ...team, member_count: result.members.length } : team));
                        })}>Remove</button>
                      )}
                    </div>
                  ))}
                </div>
                {selectedWorkspace && ["owner", "admin", "manager"].includes(selectedWorkspace.role) && (
                  <form className="project-toolbar" onSubmit={addTeamMember}>
                    <select aria-label="Workspace member" value={selectedTeamMemberId} onChange={(event) => setSelectedTeamMemberId(event.target.value)} required>
                      <option value="">Select a workspace member</option>
                      {workspaceMembers.filter((member) => !teamMembers.some((teamMember) => String(teamMember.id) === String(member.id))).map((member) => <option key={member.id} value={member.id}>{member.name} ({member.email})</option>)}
                    </select>
                    <button className="secondary-button" type="submit" disabled={isSaving || !selectedTeamMemberId}>Add member</button>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* TASK MANAGEMENT */}

          <section className="content-panel">

            <div className="section-heading">
              <h2>Tasks</h2>
              <div className="view-switch" role="group" aria-label="Task view">
                <button className={`secondary-button ${!boardMode && !calendarMode && !timelineMode ? "active" : ""}`} onClick={() => { setCalendarMode(false); setTimelineMode(false); setBoardMode(false); }} type="button">List</button>
                <button className={`secondary-button ${boardMode ? "active" : ""}`} onClick={() => { setCalendarMode(false); setTimelineMode(false); setBoardMode(true); }} type="button">Board</button>
                <button className={`secondary-button ${calendarMode ? "active" : ""}`} onClick={() => { setCalendarMode(true); setTimelineMode(false); setBoardMode(false); }} type="button">Calendar</button>
                <button className={`secondary-button ${timelineMode ? "active" : ""}`} onClick={showTimeline} type="button">Timeline</button>
                <button className="secondary-button" type="button" onClick={toggleTimeReports}>{showTimeReports ? "Hide reports" : "Time reports"}</button>
                <button className="secondary-button" type="button" onClick={toggleWorkload}>{showWorkload ? "Hide workload" : "Workload"}</button>
                <button className="secondary-button" type="button" onClick={toggleAnalytics} disabled={!workspaceId || !selectedOrganizationId}>{showAnalytics ? "Hide analytics" : "Analytics"}</button>
              </div>
            </div>

            {showTimeReports && timeReports && (
              <section className="time-reports" aria-label="Time reports">
                <h3>Daily time</h3>
                {timeReports.daily.length === 0 && <p className="kanban-empty">No time recorded in this period.</p>}
                {timeReports.daily.map((report) => <p key={report.report_date}>{String(report.report_date).slice(0, 10)} · {formatDuration(report.total_seconds)}</p>)}
                <h3>Weekly time</h3>
                {timeReports.weekly.map((report) => <p key={report.week_start}>Week of {String(report.week_start).slice(0, 10)} · {formatDuration(report.total_seconds)}</p>)}
                <h3>Project time</h3>
                {timeReports.projects.map((report) => <p key={report.project_id}>{report.project_name} · {formatDuration(report.total_seconds)}</p>)}
              </section>
            )}
            {showWorkload && (
              <section className="time-reports" aria-label="Workspace workload">
                <h3>Workload by employee</h3>
                <div className="workload-table">
                  <div className="workload-header"><strong>Employee</strong><strong>Tasks</strong><strong>Overdue</strong><strong>Next 7 days</strong><strong>Estimate</strong><strong>Tracked</strong></div>
                  {workload.map((person, index) => (
                    <div className="workload-row" key={person.assignee_id || `unassigned-${index}`}>
                      <strong>{person.assignee_name}</strong>
                      <span>{person.task_count}</span>
                      <span>{person.overdue_tasks}</span>
                      <span>{person.upcoming_tasks}</span>
                      <span>{formatDuration(Number(person.estimated_minutes) * 60)}</span>
                      <span>{formatDuration(person.tracked_seconds)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {showAnalytics && organizationAnalytics && (
              <section className="time-reports" aria-label="Advanced analytics">
                <div className="analytics-heading">
                  <h3>Organization analytics</h3>
                  <button className="secondary-button" type="button" disabled={isSaving} onClick={exportAnalyticsCsv}>Export CSV</button>
                </div>
                <p>{organizationAnalytics.metrics.task_count} tasks · {organizationAnalytics.metrics.completion_rate}% complete · {organizationAnalytics.metrics.on_time_completion_rate}% on time · {organizationAnalytics.metrics.overdue_tasks} overdue</p>
                <h3>Productivity trend</h3>
                {organizationAnalytics.trends.map((month) => <p key={month.month}>{String(month.month).slice(0, 7)} · {month.completed_tasks} completed</p>)}
                {projectAnalytics && (
                  <>
                    <h3>Selected project</h3>
                    <p>{projectAnalytics.metrics.task_count} tasks · {projectAnalytics.metrics.completion_rate}% complete · {projectAnalytics.metrics.overdue_tasks} overdue</p>
                  </>
                )}
                {teamProductivity.map(({ team, result }) => (
                  <div key={team.id}>
                    <h3>{team.name} productivity</h3>
                    {result.productivity.map((person) => <p key={person.user_id}>{person.name} · {person.completed_tasks}/{person.task_count} complete · {formatDuration(person.tracked_seconds)}</p>)}
                  </div>
                ))}
              </section>
            )}

            {/* TASK SEARCH */}

            <input
              className="search-box"
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);
                refreshTasks(selectedProjectId, workspaceId, value).catch(
                  (requestError) => setError(requestError.message)
                );
              }}
              placeholder="Search tasks..."
            />

            {/* ADD NEW TASK */}

            <form
              className="project-toolbar"
              onSubmit={createTask}
            >
              <input
                value={taskTitle}
                onChange={(event) =>
                  setTaskTitle(event.target.value)
                }
                placeholder="New task title"
              />
              <input
                type="number"
                min="0"
                max="525600"
                value={taskEstimate}
                onChange={(event) => setTaskEstimate(event.target.value)}
                aria-label="Estimated minutes"
                placeholder="Estimate (minutes)"
              />

              <button
                className="primary-button"
                type="submit"
                disabled={!selectedProjectId || !["owner", "admin", "manager"].includes(selectedWorkspace?.role) || isSaving}
              >
                {isSaving ? "Saving..." : "Add task"}
              </button>
            </form>

            {/* TASK LIST */}

            {isLoadingTasks && <p className="loading-message" role="status">Loading tasks...</p>}
            {timelineMode ? (
              <section className="project-timeline" aria-label="Project timeline">
                <div className="timeline-toolbar">
                  <button className="secondary-button" type="button" aria-label="Previous timeline period" onClick={() => setTimelineCursor((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - timelineDays))}>Previous</button>
                  <strong>{timelineStartDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {timelineDateLabels[timelineDays - 1].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</strong>
                  <button className="secondary-button" type="button" aria-label="Next timeline period" onClick={() => setTimelineCursor((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + timelineDays))}>Next</button>
                  <label>Zoom
                    <select aria-label="Timeline zoom" value={timelineDays} onChange={(event) => setTimelineDays(Number(event.target.value))}>
                      <option value="14">2 weeks</option><option value="30">1 month</option><option value="60">2 months</option>
                    </select>
                  </label>
                  <label>Group by
                    <select aria-label="Timeline grouping" value={timelineGroupBy} onChange={(event) => setTimelineGroupBy(event.target.value)}>
                      <option value="assignee">Assignee</option><option value="status">Status</option>
                    </select>
                  </label>
                </div>
                <div className="timeline-scroll">
                  <div className="timeline-row timeline-scale">
                    <strong>Task / milestone</strong>
                    <div className="timeline-track" style={{ width: `${timelineDays * 28}px` }}>
                      {timelineDateLabels.map((date) => <span key={dateKey(date)}>{date.getDate()}</span>)}
                    </div>
                  </div>
                  {timelineData.milestones.map((milestone) => {
                    const date = dateOnly(milestone.due_date);
                    if (!date) return null;
                    const position = daysBetween(date, timelineStartDate);
                    if (position < 0 || position >= timelineDays) return null;
                    return (
                      <div className="timeline-row timeline-milestone" key={`milestone-${milestone.id}`}>
                        <button className="timeline-label" type="button" onClick={() => toggleMilestone(milestone)} disabled={!["owner", "admin", "manager"].includes(selectedWorkspace?.role)}>
                          ◆ {milestone.name}{milestone.completed_at ? " · Complete" : ""}
                        </button>
                        <div className="timeline-track" style={{ width: `${timelineDays * 28}px` }}>
                          <span className="milestone-marker" style={{ left: `${position * 28}px` }} title={milestone.name}>◆</span>
                        </div>
                      </div>
                    );
                  })}
                  {[...timelineGroups.entries()].map(([groupName, groupTasks]) => (
                    <section className="timeline-group" key={groupName}>
                      <h3>{groupName}</h3>
                      {groupTasks.map((task) => {
                        const taskStart = dateOnly(task.start_date || task.due_date);
                        const taskEnd = dateOnly(task.due_date || task.start_date);
                        let left = null;
                        let width = null;
                        if (taskStart && taskEnd) {
                          const startIndex = daysBetween(taskStart, timelineStartDate);
                          const endIndex = daysBetween(taskEnd, timelineStartDate) + 1;
                          const clippedStart = Math.max(0, startIndex);
                          const clippedEnd = Math.min(timelineDays, endIndex);
                          if (clippedEnd > clippedStart) {
                            left = clippedStart * 28;
                            width = Math.max(18, (clippedEnd - clippedStart) * 28 - 4);
                          }
                        }
                        const progress = task.status === "completed" ? 100 : task.status === "in_review" ? 80 : task.status === "in_progress" ? 50 : 0;
                        return (
                          <div className="timeline-row" key={`task-${task.id}`}>
                            <div className="timeline-label">
                              <strong>{task.title}</strong>
                              <progress max="100" value={progress} aria-label={`${progress}% complete`} />
                              {task.blockers?.length > 0 && <small>Blocked by: {task.blockers.map((blocker) => blocker.title).join(", ")}</small>}
                              {!taskStart && <small>Unscheduled</small>}
                            </div>
                            <div className="timeline-track" style={{ width: `${timelineDays * 28}px` }}>
                              {left !== null && <button className={`timeline-bar timeline-bar-${task.status}`} type="button" style={{ left: `${left}px`, width: `${width}px` }} onClick={() => openCalendarTask(task)} title={`${task.title}: ${task.start_date || task.due_date} – ${task.due_date || task.start_date}`} />}
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  ))}
                </div>
                {["owner", "admin", "manager"].includes(selectedWorkspace?.role) && (
                  <form className="project-toolbar milestone-form" onSubmit={createMilestone}>
                    <input aria-label="Milestone name" value={milestoneName} onChange={(event) => setMilestoneName(event.target.value)} placeholder="Milestone name" required />
                    <input aria-label="Milestone due date" type="date" value={milestoneDueDate} onChange={(event) => setMilestoneDueDate(event.target.value)} />
                    <button className="secondary-button" type="submit" disabled={isSaving}>Add milestone</button>
                  </form>
                )}
              </section>
            ) : calendarMode ? (
              <section className="task-calendar" aria-label="Task calendar">
                <div className="calendar-toolbar">
                  <div className="calendar-navigation">
                    <button className="secondary-button" type="button" aria-label="Previous period" onClick={() => setCalendarCursor((current) => {
                      if (calendarPeriod === "month") return new Date(current.getFullYear(), current.getMonth() - 1, 1);
                      return new Date(current.getFullYear(), current.getMonth(), current.getDate() - (calendarPeriod === "week" ? 7 : 1));
                    })}>Previous</button>
                    <h3>{calendarTitle}</h3>
                    <button className="secondary-button" type="button" aria-label="Next period" onClick={() => setCalendarCursor((current) => {
                      if (calendarPeriod === "month") return new Date(current.getFullYear(), current.getMonth() + 1, 1);
                      return new Date(current.getFullYear(), current.getMonth(), current.getDate() + (calendarPeriod === "week" ? 7 : 1));
                    })}>Next</button>
                  </div>
                  <select aria-label="Calendar period" value={calendarPeriod} onChange={(event) => setCalendarPeriod(event.target.value)}>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                  </select>
                  <select aria-label="Filter by team" value={calendarTeamFilter} onChange={(event) => setCalendarTeamFilter(event.target.value)}>
                    <option value="">All teams</option>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                  <select aria-label="Filter by assignee" value={calendarAssigneeFilter} onChange={(event) => setCalendarAssigneeFilter(event.target.value)}>
                    <option value="">All assignees</option>
                    {workspaceMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </div>
                {calendarPeriod === "month" && (
                  <div className="calendar-weekdays" aria-hidden="true">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
                  </div>
                )}
                <div className={`calendar-grid calendar-grid-${calendarPeriod}`}>
                  {calendarDays.map((date) => {
                    const key = dateKey(date);
                    const events = calendarTasks.flatMap((task) => [
                      ...(task.start_date && String(task.start_date).slice(0, 10) === key ? [{ task, label: "Start" }] : []),
                      ...(task.due_date && String(task.due_date).slice(0, 10) === key ? [{ task, label: "Due" }] : []),
                    ]);
                    return (
                      <article className={`calendar-day ${calendarPeriod === "month" && date.getMonth() !== calendarCursor.getMonth() ? "calendar-day-muted" : ""}`} key={key}>
                        <time dateTime={key}>{date.getDate()}</time>
                        {events.map(({ task, label }, index) => (
                          <button
                            className={`calendar-event calendar-event-${label.toLowerCase()}`}
                            type="button"
                            key={`${task.id}-${label}-${index}`}
                            onClick={() => openCalendarTask(task)}
                            aria-label={`${label}: ${task.title}`}
                          >
                            <span>{label}</span> {task.title}
                          </button>
                        ))}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : boardMode ? (
              <div className="kanban-board" aria-label="Tasks by status">
                {["todo", "in_progress", "in_review", "completed"].map((status) => (
                  <section className="kanban-column" key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const task = tasks.find((item) => String(item.id) === draggedTaskId);
                      if (task && task.status !== status) updateTask(task, status);
                      setDraggedTaskId(null);
                    }}>
                    <header><strong>{({ todo: "To do", in_progress: "In progress", in_review: "In review", completed: "Completed" })[status]}</strong><span>{tasks.filter((task) => task.status === status).length}</span></header>
                    {tasks.filter((task) => task.status === status).map((task) => (
                      <article className="kanban-card" key={task.id} draggable={!["viewer"].includes(selectedWorkspace?.role) && (["owner", "admin", "manager"].includes(selectedWorkspace?.role) || String(task.assignee_id) === String(user.id))}
                        onDragStart={() => setDraggedTaskId(String(task.id))}
                        onDragEnd={() => setDraggedTaskId(null)}>
                        <strong>{task.title}</strong>
                        <span className={`priority-pill priority-${task.priority}`}>{task.priority}</span>
                        <label className="kanban-status-label">Move task
                          <select aria-label={`Status for ${task.title}`} value={task.status} disabled={isSaving || (!["owner", "admin", "manager"].includes(selectedWorkspace?.role) && String(task.assignee_id) !== String(user.id))} onChange={(event) => updateTask(task, event.target.value)}>
                            <option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option>
                          </select>
                        </label>
                      </article>
                    ))}
                    {tasks.filter((task) => task.status === status).length === 0 && <p className="kanban-empty">Drop a task here</p>}
                  </section>
                ))}
              </div>
            ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article
                  className="task-row"
                  key={task.id}
                >
                  <strong>{task.title}</strong>

                  <span
                    className={`priority-pill priority-${task.priority}`}
                  >
                    {task.priority}
                  </span>

                  <select
                    value={task.status}
                    disabled={isSaving || (!["owner", "admin", "manager"].includes(selectedWorkspace?.role) && String(task.assignee_id) !== String(user.id))}
                    onChange={(event) =>
                      updateTask(task, event.target.value)
                    }
                  >
                    <option value="todo">
                      To do
                    </option>

                    <option value="in_progress">
                      In progress
                    </option>
                    <option value="in_review">In review</option>

                    <option value="completed">
                      Completed
                    </option>
                  </select>
                  <div className="task-row-actions">
                  <button className="text-button" type="button" onClick={() => toggleTaskComments(task)}>
                    {String(openCommentTaskId) === String(task.id) ? "Hide comments" : `Comments${taskComments[task.id]?.length ? ` (${taskComments[task.id].length})` : ""}`}
                  </button>
                  <button className="text-button" type="button" onClick={() => toggleTaskAttachments(task)}>
                    {String(openAttachmentTaskId) === String(task.id) ? "Hide files" : `Files${taskAttachments[task.id]?.length ? ` (${taskAttachments[task.id].length})` : ""}`}
                  </button>
                  <button className="text-button" type="button" onClick={() => toggleTaskTime(task)}>
                    {String(openTimeTaskId) === String(task.id) ? "Hide time" : "Time"}
                  </button>
                  {["owner", "admin", "manager"].includes(selectedWorkspace?.role) && (
                    <button
                      className="text-button danger-button"
                      onClick={() => setDeleteConfirmation({
                        type: "task",
                        item: task,
                      })}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  )}
                  </div>
                  {String(openCommentTaskId) === String(task.id) && (
                    <section className="task-comment-panel" aria-label={`Comments for ${task.title}`}>
                      {(taskComments[task.id] || []).map((comment) => (
                        <article className="task-comment" key={comment.id}>
                          <strong>{comment.author_name || "You"}</strong><p>{comment.body}</p>
                        </article>
                      ))}
                      {taskComments[task.id]?.length === 0 && <p className="kanban-empty">No comments yet.</p>}
                      <form className="comment-form" onSubmit={(event) => addTaskComment(event, task)}>
                        <input aria-label="Write a comment" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Write a comment…" maxLength={4000} />
                        <button className="primary-button" type="submit" disabled={isSaving || !commentDraft.trim()}>Send</button>
                      </form>
                    </section>
                  )}
                  {String(openAttachmentTaskId) === String(task.id) && (
                    <section className="task-comment-panel" aria-label={`Attachments for ${task.title}`}>
                      {(taskAttachments[task.id] || []).map((attachment) => (
                        <article className="task-attachment" key={attachment.id}>
                          <div>
                            <strong>{attachment.original_name}</strong>
                            <small>{attachment.mime_type} · {(Number(attachment.byte_size) / 1024 / 1024).toFixed(2)} MB</small>
                          </div>
                          <div className="task-row-actions">
                            <button className="text-button" type="button" onClick={() => retrieveTaskAttachment(task, attachment, true)}>Preview</button>
                            <button className="text-button" type="button" onClick={() => retrieveTaskAttachment(task, attachment)}>Download</button>
                            {(String(attachment.uploaded_by) === String(user.id) || ["owner", "admin", "manager"].includes(selectedWorkspace?.role)) && (
                              <button className="text-button danger-button" type="button" disabled={isSaving} onClick={() => deleteTaskAttachment(task, attachment)}>Delete</button>
                            )}
                          </div>
                        </article>
                      ))}
                      {taskAttachments[task.id]?.length === 0 && <p className="kanban-empty">No attachments yet.</p>}
                      {selectedWorkspace?.role !== "viewer" && (
                        <label className="attachment-upload">
                          Add a PDF or image (10 MB max)
                          <input
                            type="file"
                            accept="application/pdf,image/gif,image/jpeg,image/png,image/webp"
                            disabled={isSaving}
                            onChange={(event) => uploadTaskAttachment(event, task)}
                          />
                        </label>
                      )}
                    </section>
                  )}
                  {String(openTimeTaskId) === String(task.id) && (
                    <section className="task-comment-panel task-time-panel" aria-label={`Time tracking for ${task.title}`}>
                      <strong>Tracked: {formatDuration(taskTimeData[task.id]?.summary?.total_seconds)}</strong>
                      {activeWorkspaceTimer && (
                        <p>
                          Active timer: {activeWorkspaceTimer.task_title}
                          {selectedWorkspace?.role !== "viewer" && <button className="text-button" type="button" disabled={isSaving} onClick={() => stopTaskTimer({ id: activeWorkspaceTimer.task_id }, activeWorkspaceTimer)}>Stop timer</button>}
                        </p>
                      )}
                      {(taskTimeData[task.id]?.entries || []).map((entry) => (
                        <article className="task-attachment" key={entry.id}>
                          {String(editingTimeEntryId) === String(entry.id) ? (
                            <form className="time-entry-edit" onSubmit={(event) => updateTimeEntry(event, task, entry)}>
                              <label>Start <input type="datetime-local" value={timeEntryDraft.startedAt} onChange={(event) => setTimeEntryDraft((current) => ({ ...current, startedAt: event.target.value }))} required /></label>
                              <label>End <input type="datetime-local" value={timeEntryDraft.endedAt} onChange={(event) => setTimeEntryDraft((current) => ({ ...current, endedAt: event.target.value }))} required /></label>
                              <label>Note <input value={timeEntryDraft.note} onChange={(event) => setTimeEntryDraft((current) => ({ ...current, note: event.target.value }))} maxLength={1000} /></label>
                              <button className="primary-button" type="submit" disabled={isSaving}>Save entry</button>
                              <button className="text-button" type="button" onClick={() => setEditingTimeEntryId(null)}>Cancel</button>
                            </form>
                          ) : (
                            <>
                              <div>
                                <strong>{entry.user_name || "Teammate"} · {entry.ended_at ? formatDuration(entry.duration_seconds) : "Timer running"}</strong>
                                <small>{new Date(entry.started_at).toLocaleString()}{entry.ended_at ? ` – ${new Date(entry.ended_at).toLocaleTimeString()}` : ""}{entry.note ? ` · ${entry.note}` : ""}</small>
                              </div>
                              {entry.ended_at && selectedWorkspace?.role !== "viewer" && (String(entry.user_id) === String(user.id) || ["owner", "admin", "manager"].includes(selectedWorkspace?.role)) && (
                                <div className="task-row-actions">
                                  <button className="text-button" type="button" onClick={() => beginEditTimeEntry(entry)}>Edit</button>
                                  <button className="text-button danger-button" type="button" disabled={isSaving} onClick={() => deleteTimeEntry(task, entry)}>Delete</button>
                                </div>
                              )}
                            </>
                          )}
                        </article>
                      ))}
                      {!activeWorkspaceTimer && selectedWorkspace?.role !== "viewer" && (
                        <button className="primary-button" type="button" disabled={isSaving} onClick={() => startTaskTimer(task)}>Start timer</button>
                      )}
                      {selectedWorkspace?.role !== "viewer" && (
                        <form className="manual-time-form" onSubmit={(event) => createManualTimeEntry(event, task)}>
                          <label>Start <input type="datetime-local" value={manualTimeDraft.startedAt} onChange={(event) => setManualTimeDraft((current) => ({ ...current, startedAt: event.target.value }))} required /></label>
                          <label>End <input type="datetime-local" value={manualTimeDraft.endedAt} onChange={(event) => setManualTimeDraft((current) => ({ ...current, endedAt: event.target.value }))} required /></label>
                          <label>Note <input value={manualTimeDraft.note} onChange={(event) => setManualTimeDraft((current) => ({ ...current, note: event.target.value }))} maxLength={1000} /></label>
                          <button className="secondary-button" type="submit" disabled={isSaving}>Add manual time</button>
                        </form>
                      )}
                    </section>
                  )}
                </article>
              ))}
            </div>
            )}
            {!isLoadingTasks && tasks.length === 0 && (
              <p className="empty-state">No tasks found. Create a task to get started.</p>
            )}
          </section>

        </section>
      </main>
      {deleteConfirmation && (
        <div className="modal-backdrop">
          <section
            className="delete-confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
          >
            <h2 id="delete-confirmation-title">Confirm deletion</h2>
            <p>
              Delete “{deleteConfirmation.item.name || deleteConfirmation.item.title}”?
              {deleteConfirmation.type !== "task" &&
                " Related records will also be deleted."}
            </p>
            <div className="confirmation-actions">
              <button
                className="secondary-button"
                onClick={() => setDeleteConfirmation(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="primary-button danger-button"
                onClick={confirmDelete}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Confirm delete"}
              </button>
            </div>
          </section>
        </div>
      )}
      {previewAttachment && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewAttachment(null);
        }}>
          <section className="attachment-preview" role="dialog" aria-modal="true" aria-label={`Preview ${previewAttachment.original_name}`}>
            <header>
              <strong>{previewAttachment.original_name}</strong>
              <button className="text-button" type="button" onClick={() => setPreviewAttachment(null)}>Close preview</button>
            </header>
            {previewAttachment.mime_type === "application/pdf"
              ? <iframe title={`Preview ${previewAttachment.original_name}`} src={previewAttachment.url} sandbox="" />
              : <img src={previewAttachment.url} alt={previewAttachment.original_name} />}
          </section>
        </div>
      )}
      {calendarTask && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCalendarTask(null);
        }}>
          <section className="delete-confirmation calendar-task-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-task-title">
            <h2 id="calendar-task-title">{calendarTask.title}</h2>
            <p>{calendarTask.status.replace("_", " ")} · {calendarTask.priority} priority · {calendarTask.project_name || projects.find((project) => String(project.id) === String(calendarTask.project_id))?.name || "Project"}</p>
            <p>{calendarTask.assignee_name || "Unassigned"}{calendarTask.description ? ` · ${calendarTask.description}` : ""}</p>
            <form onSubmit={saveCalendarTaskDates}>
              <label className="form-field">Start date
                <input type="date" value={calendarTaskDates.startDate} disabled={!["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setCalendarTaskDates((current) => ({ ...current, startDate: event.target.value }))} />
              </label>
              <label className="form-field">Due date
                <input type="date" value={calendarTaskDates.dueDate} disabled={!["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setCalendarTaskDates((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>
              <div className="confirmation-actions">
                <button className="secondary-button" type="button" onClick={() => setCalendarTask(null)}>Close</button>
                {["owner", "admin", "manager"].includes(selectedWorkspace?.role) && (
                  <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save dates"}</button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
