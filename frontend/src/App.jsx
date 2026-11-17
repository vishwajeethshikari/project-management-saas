
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { apiRequest } from "./api";
import { resolveRoute } from "./routing";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  ListTodo,
  Columns3,
  Calendar as CalendarIcon,
  Milestone,
  Users,
  BarChart3,
  Clock,
  Settings as SettingsIcon,
  Search,
  Sun,
  Moon,
  Bell,
  CheckCircle2,
  Building2,
  Briefcase,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  EyeOff,
  Mail,
  Contact,
  UserRound
} from "lucide-react";

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
  if (view === "agenda") return Array.from({ length: 14 }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + index));
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-branding">
          <div className="brand-mark">P</div>
          <span>PROJECTFLOW</span>
        </div>
        <div className="auth-hero-content">
          <div className="eyebrow" style={{ color: "#a5b4fc" }}>ENTERPRISE COLLABORATION SAAS</div>
          <h1>Accelerate your product delivery with intelligent workflows.</h1>
          <p>
            The unified platform for cross-functional teams. Coordinate roadmaps, manage Kanban sprints, track real-time workloads, and maintain complete multi-tenant security.
          </p>
          <div className="auth-features-list">
            <div className="auth-feature-item">
              <CheckCircle2 size={18} color="#34d399" />
              <span>Interactive Gantt & Sprints with milestone tracking</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 size={18} color="#34d399" />
              <span>Granular Role-Based Access (Owner, Admin, Manager, Employee)</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 size={18} color="#34d399" />
              <span>Multi-tenant isolated organizations & workspaces</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 size={18} color="#34d399" />
              <span>Live workload analytics and native time tracking</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          © 2026 ProjectFlow SaaS Inc. All rights reserved.
        </div>
      </div>

      <div className="auth-form-wrapper">
        <form className="auth-card" onSubmit={submit}>
          <div className="brand" style={{ marginBottom: "16px" }}>
            <div className="brand-mark">P</div>
            <span>PROJECTFLOW</span>
          </div>

          <h1>
            {{ login: "Welcome back", register: "Create your account", forgot: "Recover your account", reset: "Choose a new password" }[mode]}
          </h1>
          <p className="auth-subtitle">
            {mode === "login" ? "Enter your credentials to access your workspaces." : mode === "register" ? "Start organizing your projects and team in seconds." : "Follow instructions to securely regain account access."}
          </p>

          {mode === "register" && (
            <label className="form-field">
              Full Name
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

          {mode !== "reset" && (
            <label className="form-field">
              Work Email
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
              />
            </label>
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <label className="form-field">
              {mode === "reset" ? "New password" : "Password"}
              <span className="password-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button className="password-visibility" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}

          <button
            className="primary-button"
            style={{ width: "100%", padding: "10px", marginTop: "8px" }}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Please wait..."
              : ({ login: "Sign in", register: "Create account", forgot: "Send recovery link", reset: "Reset password" }[mode])}
          </button>

          {(mode === "login" || mode === "register") && (
            <button
              className="text-button"
              type="button"
              style={{ marginTop: "12px", alignSelf: "center" }}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
            >
              {mode === "login" ? "Create an account" : "Already have an account?"}
            </button>
          )}
          {mode === "login" && (
            <button className="text-button" type="button" style={{ alignSelf: "center" }} onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>
              Forgot password?
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button className="text-button" type="button" style={{ alignSelf: "center" }} onClick={() => { setMode("login"); setError(""); setNotice(""); }}>
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </main>
  );
}

// ==============================
// MAIN APPLICATION
// ==============================

export default function App() {
  const initializationStarted = useRef(false);
  const [pathname, setPathname] = useState(() => window.location.pathname === "/" ? "/dashboard" : (window.location.pathname || "/dashboard"));
  const route = resolveRoute(pathname);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("projectflow_theme") || "light";
    } catch {
      return "light";
    }
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const activeNav = route.nav;
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState({ projects: [], tasks: [], members: [] });
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [boardMode, setBoardMode] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [timelineMode, setTimelineMode] = useState(false);
  const routeBoardMode = route.key === "board" || boardMode;
  const routeCalendarMode = route.key === "calendar" || calendarMode;
  const routeTimelineMode = route.key === "timeline" || timelineMode;
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
  const [myWorkData, setMyWorkData] = useState(null);
  const [workspaceTasks, setWorkspaceTasks] = useState([]);
  const [projectDetail, setProjectDetail] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectDetailTab, setProjectDetailTab] = useState("overview");
  const [teamDetail, setTeamDetail] = useState(null);
  const [teamDetailDraft, setTeamDetailDraft] = useState({ name: "", description: "" });
  const [taskDetail, setTaskDetail] = useState(null);
  const [taskDetailSubtasks, setTaskDetailSubtasks] = useState([]);
  const [taskDetailComments, setTaskDetailComments] = useState([]);
  const [taskDetailAttachments, setTaskDetailAttachments] = useState([]);
  const [taskDetailActivity, setTaskDetailActivity] = useState([]);
  const [taskDetailDraft, setTaskDetailDraft] = useState({ title: "", description: "", priority: "medium", startDate: "", dueDate: "" });
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [profileDraft, setProfileDraft] = useState({ name: "", email: "" });
  const [profileNotice, setProfileNotice] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [timeFromDate, setTimeFromDate] = useState("");
  const [timeToDate, setTimeToDate] = useState("");
  const [reportTeamFilter, setReportTeamFilter] = useState("");
  const [taskPageSearch, setTaskPageSearch] = useState("");
  const [taskPageStatus, setTaskPageStatus] = useState("");
  const [taskPagePriority, setTaskPagePriority] = useState("");
  const [taskPageProject, setTaskPageProject] = useState("");
  const [taskPageTitle, setTaskPageTitle] = useState("");
  const [taskPageProjectId, setTaskPageProjectId] = useState("");

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
  const routeWorkspaceRole = workspaces.find((workspace) => String(workspace.id) === String(workspaceId))?.role;

  function navigate(path, { replace = false } = {}) {
    if (replace) window.history.replaceState({}, "", path);
    else if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setPathname(path);
    setError("");
    setRouteError("");
  }

  function setActiveNav(nav) {
    const paths = {
      dashboard: "/dashboard", inbox: "/inbox", "my-work": "/my-work", projects: "/projects", timeline: "/timeline",
      tasks: "/tasks", board: "/board", teams: "/teams", members: "/members",
      calendar: "/calendar", reports: "/reports", time: "/time", settings: "/settings", profile: "/profile",
    };
    if (paths[nav]) navigate(paths[nav]);
  }

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || "/dashboard");
      setRouteError("");
    };
    window.addEventListener("popstate", handlePopState);
    if (window.location.pathname === "/") window.history.replaceState({}, "", "/dashboard");
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("projectflow_theme", theme);
    } catch {
      // The selected theme remains active for this session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const query = paletteQuery.trim();
    if (!showCommandPalette || !workspaceId || !query) return undefined;
    let current = true;
    const timer = window.setTimeout(async () => {
      setIsGlobalSearchLoading(true);
      try {
        const result = await apiRequest(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`);
        if (current) setGlobalSearchResults(result.results);
      } catch (requestError) {
        if (current) setRouteError(requestError.message);
      } finally {
        if (current) setIsGlobalSearchLoading(false);
      }
    }, 180);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [showCommandPalette, paletteQuery, workspaceId]);

  useEffect(() => {
    if (!workspaceId || ["not-found", "projects", "teams", "members", "settings", "profile", "inbox"].includes(route.key)) return undefined;
    let current = true;
    const loadPageData = async () => {
      setIsLoadingRoute(true);
      setRouteError("");
      try {
        if (route.key === "my-work") {
          const result = await apiRequest(`/workspaces/${workspaceId}/my-work`);
          if (current) setMyWorkData(result.myWork || result);
        } else if (["tasks", "board", "calendar"].includes(route.key)) {
          const query = new URLSearchParams();
          if (taskPageSearch.trim()) query.set("search", taskPageSearch.trim());
          if (taskPageStatus) query.set("status", taskPageStatus);
          if (taskPagePriority) query.set("priority", taskPagePriority);
          if (taskPageProject) query.set("projectId", taskPageProject);
          const result = await apiRequest(`/workspaces/${workspaceId}/tasks${query.size ? `?${query}` : ""}`);
          if (current) setWorkspaceTasks(result.tasks);
        } else if (route.key === "project-detail") {
          setSelectedProjectId(route.id);
          setProjectDetail(null);
          const [projectResult, taskResult, activityResult] = await Promise.all([
            apiRequest(`/workspaces/${workspaceId}/projects/${route.id}`),
            apiRequest(`/workspaces/${workspaceId}/projects/${route.id}/tasks?search=`),
            apiRequest(`/workspaces/${workspaceId}/activity?limit=50`),
          ]);
          if (current) {
            setProjectDetail(projectResult.project);
            setProjectMembers(projectResult.project.members || []);
            setTasks(taskResult.tasks);
            setActivityLog(activityResult.activity.filter((item) => item.resource_type === "project" && String(item.resource_id) === String(route.id)));
          }
        } else if (route.key === "timeline") {
          const result = selectedProjectId ? await apiRequest(`/workspaces/${workspaceId}/projects/${selectedProjectId}/timeline`) : { tasks: [], milestones: [] };
          if (current) {
            setTimelineData({ tasks: result.tasks, milestones: result.milestones });
          }
        } else if (route.key === "task-detail") {
          const [taskResult, subtasksResult, commentsResult, attachmentsResult, activityResult] = await Promise.all([
            apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}`),
            apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/subtasks`),
            apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/comments`),
            apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/attachments`),
            apiRequest(`/workspaces/${workspaceId}/activity?limit=100`),
          ]);
          if (current) {
            setTaskDetail(taskResult.task);
            setTaskDetailSubtasks(subtasksResult.subtasks);
            setTaskDetailComments(commentsResult.comments);
            setTaskDetailAttachments(attachmentsResult.attachments);
            setTaskDetailActivity(activityResult.activity.filter((item) => item.resource_type === "task" && String(item.resource_id) === String(route.id)));
            setTaskDetailDraft({ title: taskResult.task.title || "", description: taskResult.task.description || "", priority: taskResult.task.priority || "medium", startDate: taskResult.task.start_date ? String(taskResult.task.start_date).slice(0, 10) : "", dueDate: taskResult.task.due_date ? String(taskResult.task.due_date).slice(0, 10) : "" });
          }
        } else if (route.key === "team-detail") {
          setTeamDetail(null);
          const [teamResult, membersResult, taskResult, productivityResult] = await Promise.all([
            apiRequest(`/workspaces/${workspaceId}/teams/${route.id}`),
            apiRequest(`/workspaces/${workspaceId}/teams/${route.id}/members`),
            apiRequest(`/workspaces/${workspaceId}/tasks`),
            apiRequest(`/workspaces/${workspaceId}/teams/${route.id}/productivity`),
          ]);
          if (current) {
            setTeamDetail(teamResult.team);
            setTeamDetailDraft({ name: teamResult.team.name || "", description: teamResult.team.description || "" });
            setSelectedTeamId(route.id);
            setTeamMembers(membersResult.members);
            setWorkspaceTasks(taskResult.tasks);
            setTeamProductivity([{ team: teams.find((item) => String(item.id) === String(route.id)) || teamResult.team, result: productivityResult }]);
          }
        } else if (route.key === "reports") {
          const [organizationResult, projectResult, teamResults] = await Promise.all([
            selectedOrganizationId ? apiRequest(`/organizations/${selectedOrganizationId}/analytics`) : Promise.resolve(null),
            selectedProjectId ? apiRequest(`/workspaces/${workspaceId}/projects/${selectedProjectId}/analytics`) : Promise.resolve(null),
            Promise.all(teams.map(async (team) => ({
              team,
              result: await apiRequest(`/workspaces/${workspaceId}/teams/${team.id}/productivity`),
            }))),
          ]);
          if (current) {
            setOrganizationAnalytics(organizationResult);
            setProjectAnalytics(projectResult);
            setTeamProductivity(teamResults);
            setShowAnalytics(true);
          }
        } else if (route.key === "time") {
          const timeQuery = new URLSearchParams();
          if (timeFromDate) timeQuery.set("fromDate", timeFromDate);
          if (timeToDate) timeQuery.set("toDate", timeToDate);
          const [reportResult, activeResult, taskResult] = await Promise.all([
            apiRequest(`/workspaces/${workspaceId}/time-reports${timeQuery.size ? `?${timeQuery}` : ""}`),
            apiRequest(`/workspaces/${workspaceId}/time-entries/active`),
            apiRequest(`/workspaces/${workspaceId}/tasks`),
          ]);
          if (current) {
            setTimeReports(reportResult);
            setActiveWorkspaceTimer(activeResult.activeTimers[0] || null);
            setWorkspaceTasks(taskResult.tasks);
            setShowTimeReports(true);
          }
        } else if (route.key === "dashboard" && !["employee", "viewer"].includes(routeWorkspaceRole)) {
          const result = await apiRequest(`/workspaces/${workspaceId}/workload`);
          if (current) setWorkload(result.workload);
        } else if (route.key === "dashboard") {
          const result = await apiRequest(`/workspaces/${workspaceId}/my-work`);
          if (current) setMyWorkData(result.myWork || result);
        }
      } catch (requestError) {
        if (current) setRouteError(requestError.message);
      } finally {
        if (current) setIsLoadingRoute(false);
      }
    };
    loadPageData();
    return () => { current = false; };
  }, [route.key, route.id, workspaceId, selectedOrganizationId, selectedProjectId, workspaces, routeWorkspaceRole, teams, taskPageSearch, taskPageStatus, taskPagePriority, taskPageProject, timeFromDate, timeToDate, user]);

  const myAssignedTasks = useMemo(() => {
    if (!user || !tasks) return [];
    return tasks.filter((t) => String(t.assignee_id) === String(user.id));
  }, [tasks, user]);

  const myOverdueTasks = useMemo(() => {
    const today = dateKey(new Date());
    return myAssignedTasks.filter(
      (t) => t.due_date && String(t.due_date).slice(0, 10) < today && t.status !== "completed"
    );
  }, [myAssignedTasks]);

  const myDueTodayTasks = useMemo(() => {
    const today = dateKey(new Date());
    return myAssignedTasks.filter(
      (t) => t.due_date && String(t.due_date).slice(0, 10) === today && t.status !== "completed"
    );
  }, [myAssignedTasks]);

  const myCompletedTasks = useMemo(() => {
    return myAssignedTasks.filter((t) => t.status === "completed");
  }, [myAssignedTasks]);

  function getProjectHealth(project) {
    const projTasks = tasks.filter((t) => String(t.project_id) === String(project.id));
    if (projTasks.length === 0) return { label: "On Track", color: "var(--success)" };
    const completed = projTasks.filter((t) => t.status === "completed").length;
    const rate = completed / projTasks.length;
    const today = dateKey(new Date());
    const isPastDeadline = project.deadline && String(project.deadline).slice(0, 10) < today && rate < 1;
    if (isPastDeadline) return { label: "Delayed", color: "var(--danger)" };
    if (rate >= 0.6) return { label: "On Track", color: "var(--success)" };
    return { label: "At Risk", color: "var(--warning)" };
  }

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
      setTaskPageProjectId(firstProject?.id ? String(firstProject.id) : "");

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

  async function markAllNotificationsRead() {
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/notifications/read-all`, { method: "POST" });
      setNotifications(result.notifications || notifications.map((item) => ({ ...item, is_read: true })));
    });
  }

  async function deleteNotification(notification) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/notifications/${notification.id}`, { method: "DELETE" });
      setNotifications((current) => current.filter((item) => String(item.id) !== String(notification.id)));
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileNotice("");
    await runAction(async () => {
      const result = await apiRequest("/auth/me", { method: "PATCH", body: { name: profileDraft.name.trim() } });
      setUser(result.user);
      setProfileNotice("Profile saved.");
    });
  }

  async function changeAccountPassword(event) {
    event.preventDefault();
    setProfileNotice("");
    await runAction(async () => {
      const result = await apiRequest("/auth/password/change", { method: "POST", body: { currentPassword, newPassword } });
      setCurrentPassword("");
      setNewPassword("");
      setProfileNotice(result.message || "Password changed.");
    });
  }

  async function updateWorkspaceTask(task, body) {
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}`, { method: "PATCH", body });
      setWorkspaceTasks((current) => current.map((item) => String(item.id) === String(task.id) ? { ...item, ...result.task } : item));
      setTasks((current) => current.map((item) => String(item.id) === String(task.id) ? { ...item, ...result.task } : item));
      if (String(taskDetail?.id) === String(task.id)) setTaskDetail((current) => ({ ...current, ...result.task }));
      if (route.key === "my-work") {
        const refreshed = await apiRequest(`/workspaces/${workspaceId}/my-work`);
        setMyWorkData(refreshed.myWork || refreshed);
      }
    });
  }

  async function createWorkspaceTask(event) {
    event.preventDefault();
    if (!taskPageTitle.trim() || !taskPageProjectId) return;
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: { title: taskPageTitle.trim(), projectId: Number(taskPageProjectId), status: "todo", priority: "medium" },
      });
      setTaskPageTitle("");
      setWorkspaceTasks((current) => [result.task, ...current]);
    });
  }

  async function addProjectMember(event) {
    event.preventDefault();
    if (!workspaceId || !projectDetail?.id || !selectedTeamMemberId) return;
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/projects/${projectDetail.id}/members`, { method: "POST", body: { userId: Number(selectedTeamMemberId) } });
      const result = await apiRequest(`/workspaces/${workspaceId}/projects/${projectDetail.id}/members`);
      setProjectMembers(result.members);
      setSelectedTeamMemberId("");
    });
  }

  async function removeProjectMember(member) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/projects/${projectDetail.id}/members/${member.user_id}`, { method: "DELETE" });
      setProjectMembers((current) => current.filter((item) => String(item.user_id) !== String(member.user_id)));
    });
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
      setProfileDraft({ name: me.user.name || "", email: me.user.email || "" });

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

  async function removeTeamMember(member) {
    await runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/teams/${selectedTeamId}/members/${member.id}`, { method: "DELETE" });
      const result = await loadTeamMembers(selectedTeamId);
      setTeams((current) => current.map((team) => String(team.id) === String(selectedTeamId) ? { ...team, member_count: result.members.length } : team));
    });
  }

  async function saveTeamDetails(event) {
    event.preventDefault();
    if (!teamDetailDraft.name.trim() || !teamDetail) return;
    await runAction(async () => {
      const result = await apiRequest(`/workspaces/${workspaceId}/teams/${teamDetail.id}`, { method: "PATCH", body: { name: teamDetailDraft.name.trim(), description: teamDetailDraft.description.trim() || null } });
      setTeamDetail(result.team);
      setTeams((current) => current.map((team) => String(team.id) === String(result.team.id) ? { ...team, ...result.team } : team));
    });
  }

  async function deleteTeam(team) {
    return runAction(async () => {
      await apiRequest(`/workspaces/${workspaceId}/teams/${team.id}`, { method: "DELETE" });
      setTeams((current) => current.filter((item) => String(item.id) !== String(team.id)));
      navigate("/teams");
      return true;
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
      setTaskPageProjectId(String(result.project.id));
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
      if (String(route.id) === String(task.id) && route.key === "task-detail") setTaskDetailAttachments(result.attachments);
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
      if (route.key === "task-detail" && String(route.id) === String(task.id)) {
        setTaskDetailAttachments((current) => current.filter((item) => String(item.id) !== String(attachment.id)));
      }
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
          : type === "team"
            ? await deleteTeam(item)
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
  const calendarTaskSource = route.key === "calendar" ? workspaceTasks : tasks;
  const calendarTasks = calendarTaskSource.filter((task) =>
    (!calendarAssigneeFilter || String(task.assignee_id || "") === calendarAssigneeFilter) &&
    (!calendarTeamFilter || calendarTeamMemberIds.has(String(task.assignee_id || "")))
  );
  const calendarTitle = calendarPeriod === "day"
    ? calendarCursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : calendarPeriod === "agenda"
      ? `${calendarDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${calendarDays.at(-1).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
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

      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-mark">p</div>
          <span>projectflow</span>
          <button className="sidebar-collapse-button" type="button" onClick={() => setIsSidebarCollapsed((current) => !current)} aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"} title={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}>
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
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

        <div className="sidebar-section-title">NAVIGATION</div>
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <button
            className={`sidebar-nav-item ${activeNav === "dashboard" ? "active" : ""}`}
            type="button"
            title="Dashboard"
            onClick={() => {
              setActiveNav("dashboard");
              setBoardMode(false);
              setCalendarMode(false);
              setTimelineMode(false);
            }}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button className={`sidebar-nav-item ${activeNav === "inbox" ? "active" : ""}`} type="button" title="Inbox" onClick={() => setActiveNav("inbox")}>
            <Mail size={16} /><span>Inbox</span>
            {notifications.filter((item) => !item.is_read).length > 0 && <span className="badge">{notifications.filter((item) => !item.is_read).length}</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "my-work" ? "active" : ""}`}
            type="button"
            title="My Work"
            onClick={() => {
              setActiveNav("my-work");
              setBoardMode(false);
              setCalendarMode(false);
              setTimelineMode(false);
            }}
          >
            <CheckSquare size={16} />
            <span>My Work</span>
            {myOverdueTasks.length > 0 && <span className="badge" style={{ backgroundColor: "var(--danger)" }}>{myOverdueTasks.length}</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "projects" ? "active" : ""}`}
            type="button"
            title="Projects"
            onClick={() => {
              setActiveNav("projects");
              setBoardMode(false);
              setCalendarMode(false);
              setTimelineMode(false);
            }}
          >
            <FolderKanban size={16} />
            <span>Projects</span>
            <span className="badge" style={{ backgroundColor: "var(--brand)" }}>{projects.length}</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "tasks" ? "active" : ""}`}
            type="button"
            title="Tasks"
            onClick={() => {
              setActiveNav("tasks");
              setBoardMode(false);
              setCalendarMode(false);
              setTimelineMode(false);
            }}
          >
            <ListTodo size={16} />
            <span>Tasks</span>
            <span className="badge" style={{ backgroundColor: "var(--sidebar-hover)" }}>{tasks.length}</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "board" ? "active" : ""}`}
            type="button"
            title="Kanban Board"
            onClick={() => {
              setActiveNav("board");
              setBoardMode(true);
              setCalendarMode(false);
              setTimelineMode(false);
            }}
          >
            <Columns3 size={16} />
            <span>Kanban Board</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "calendar" ? "active" : ""}`}
            type="button"
            title="Calendar"
            onClick={() => {
              setActiveNav("calendar");
              setCalendarMode(true);
              setBoardMode(false);
              setTimelineMode(false);
            }}
          >
            <CalendarIcon size={16} />
            <span>Calendar</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "timeline" ? "active" : ""}`}
            type="button"
            title="Timeline"
            onClick={() => {
              setActiveNav("timeline");
              showTimeline();
            }}
          >
            <Milestone size={16} />
            <span>Timeline</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "teams" ? "active" : ""}`}
            type="button"
            title="Teams and Members"
            onClick={() => {
              setActiveNav("teams");
              setBoardMode(false);
              setCalendarMode(false);
              setTimelineMode(false);
            }}
          >
            <Users size={16} />
            <span>Teams & Members</span>
          </button>

          <button className={`sidebar-nav-item ${activeNav === "members" ? "active" : ""}`} type="button" title="Members" onClick={() => setActiveNav("members")}>
            <Contact size={16} /><span>Members</span><span className="badge">{workspaceMembers.length}</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "reports" ? "active" : ""}`}
            type="button"
            title="Reports and Analytics"
            onClick={() => {
              setActiveNav("reports");
              if (!showAnalytics && workspaceId && selectedOrganizationId) toggleAnalytics();
            }}
          >
            <BarChart3 size={16} />
            <span>Reports & Analytics</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "time" ? "active" : ""}`}
            type="button"
            title="Time Tracking"
            onClick={() => {
              setActiveNav("time");
              if (!showTimeReports) toggleTimeReports();
            }}
          >
            <Clock size={16} />
            <span>Time Tracking</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeNav === "settings" ? "active" : ""}`}
            type="button"
            title="Settings"
            onClick={() => {
              setActiveNav("settings");
            }}
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
          <button className={`sidebar-nav-item ${activeNav === "profile" ? "active" : ""}`} type="button" title="My Profile" onClick={() => setActiveNav("profile")}>
            <UserRound size={16} /><span>My Profile</span>
          </button>
        </nav>

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
            <Building2 size={16} color="var(--text-muted)" />
            <span>{selectedOrganization?.name || "Organization"}</span>
            <span style={{ color: "var(--border)" }}>/</span>
            <Briefcase size={16} color="var(--brand)" />
            <strong>{selectedWorkspace?.name || "Workspace"}</strong>
            <span style={{ color: "var(--border)" }}>/</span>
            <span style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>
              {route.title}
            </span>
          </div>
          <div className="topbar-actions">
            {activeWorkspaceTimer && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 10px",
                  backgroundColor: "var(--success-bg)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "12px",
                  color: "var(--success-text)",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "var(--success)",
                  }}
                />
                <span>Timer: {activeWorkspaceTimer.task_title}</span>
                <button
                  type="button"
                  className="text-button danger-button"
                  style={{ padding: "0 4px", fontSize: "11px" }}
                  onClick={() => stopTaskTimer({ id: activeWorkspaceTimer.task_id }, activeWorkspaceTimer)}
                >
                  Stop
                </button>
              </div>
            )}

            <button
              className="search-command-btn"
              type="button"
              onClick={() => setShowCommandPalette(true)}
              aria-label="Search or run command"
            >
              <Search size={14} />
              <span>Search or jump to...</span>
              <kbd>⌘K</kbd>
            </button>

            <button
              className="icon-btn"
              type="button"
              onClick={() => setTheme((curr) => (curr === "dark" ? "light" : "dark"))}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle color theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="secondary-button inbox-toggle" type="button" aria-expanded={showInbox} onClick={() => setShowInbox((current) => !current)}>
              <Bell size={14} />
              <span>Inbox</span>{notifications.filter((item) => !item.is_read).length > 0 ? ` · ${notifications.filter((item) => !item.is_read).length}` : ""}
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

        <section className="page-container" data-page={route.key}>

          {/* PAGE HEADING */}

          <div className="page-heading">
            <div>
              <div className="eyebrow">{selectedWorkspace?.name || "PROJECTFLOW WORKSPACE"}</div>
              <h1>{route.key === "my-work" ? `Your day, ${user.name?.split(" ")[0] || "teammate"}.` : route.key === "dashboard" ? `${({ owner: "Admin", admin: "Admin", manager: "Manager", employee: "Employee", viewer: "Workspace" })[selectedWorkspace?.role] || "Workspace"} dashboard` : route.title}</h1>
              <p className="route-description">{({
                dashboard: "A live view of delivery and team health.", inbox: "Updates and mentions from your workspace.", "my-work": "Your assignments, due dates, and daily priorities.", projects: "Plan and track work across your projects.", "project-detail": projectDetail?.description || "Project plan, delivery, and people.", tasks: "Tasks you can access across this workspace.", "task-detail": "Task details and collaboration.", board: "Move work through each delivery stage.", teams: "Teams and their workspace membership.", "team-detail": teamDetail?.description || "Team roster and delivery overview.", members: "People who can access this workspace.", calendar: "Task start dates and deadlines.", timeline: "Milestones and project schedule.", reports: "Workspace and team performance from recorded activity.", time: "Active timers and recorded project time.", settings: "Workspace, organization, notifications, and appearance.", profile: "Your personal account details and security.",
              })[route.key] || ""}</p>
            </div>
          </div>

          {error && (
            <p className="form-error">{error}</p>
          )}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          {routeError && <p className="form-error" role="alert">{routeError}</p>}
          {isLoadingRoute && <p className="loading-message" role="status">Loading {route.title.toLowerCase()}…</p>}
          {route.key === "not-found" && <section className="content-panel not-found-panel"><h2>That page isn’t here</h2><p>Choose a workspace page from the navigation.</p><button className="primary-button" type="button" onClick={() => navigate("/dashboard")}>Go to dashboard</button></section>}

          {route.key === "inbox" && <section className="content-panel route-inbox-page">
            <div className="section-heading"><div><h2>Notifications</h2><p>Assignments, mentions, and deadline updates.</p></div><button className="secondary-button" type="button" disabled={isSaving || notifications.every((item) => item.is_read)} onClick={markAllNotificationsRead}>Mark all as read</button></div>
            <div className="notification-preferences">{[["assignment_enabled", "assignmentEnabled", "Assignments"], ["mention_enabled", "mentionEnabled", "Mentions"], ["due_date_enabled", "dueDateEnabled", "Due-date reminders"]].map(([column, field, label]) => <label key={column}><input type="checkbox" checked={notificationPreferences[column]} onChange={(event) => updateNotificationPreference(field, event.target.checked)} />{label}</label>)}</div>
            {notifications.length === 0 ? <p className="empty-state">You’re all caught up.</p> : <div className="notification-list">{notifications.map((notification) => <article className={`notification-row ${notification.is_read ? "read" : "unread"}`} key={notification.id}><button type="button" className="notification-open" onClick={() => markNotificationRead(notification)}><strong>{notification.message}</strong><time>{new Date(notification.created_at).toLocaleString()}</time></button><button className="text-button danger-button" type="button" aria-label={`Delete notification: ${notification.message}`} onClick={() => deleteNotification(notification)}>Delete</button></article>)}</div>}
          </section>}

          {route.key === "my-work" && <section className="content-panel route-my-work-page"><div className="section-heading"><div><h2>My priorities</h2><p>Live assignments from your workspace.</p></div></div>
            <div className="my-day-stats"><article><span>Overdue</span><strong>{myWorkData?.stats?.overdue ?? 0}</strong></article><article><span>Due today</span><strong>{myWorkData?.stats?.dueToday ?? 0}</strong></article><article><span>Upcoming</span><strong>{myWorkData?.stats?.upcoming ?? 0}</strong></article></div>
            {!myWorkData?.tasks?.length ? <p className="empty-state">No tasks are assigned to you yet.</p> : <div className="route-task-list">{myWorkData.tasks.map((task) => <article className="route-task-row" key={task.id}><div><button className="task-title-link" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button><small>{task.project_name} · {task.due_date ? `Due ${dateOnly(task.due_date)?.toLocaleDateString()}` : "No due date"}</small></div><select aria-label={`Status for ${task.title}`} value={task.status} disabled={isSaving || selectedWorkspace?.role === "viewer"} onChange={(event) => updateWorkspaceTask(task, { status: event.target.value })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option></select></article>)}</div>}
          </section>}

          {route.key === "members" && <section className="content-panel route-members-page"><div className="section-heading"><div><h2>Workspace members</h2><p>{workspaceMembers.length} people with access to this workspace.</p></div></div>
            {workspaceMembers.length === 0 ? <p className="empty-state">No workspace members found.</p> : <div className="member-directory">{workspaceMembers.map((member) => <article className="member-card" key={member.id}><span className="member-avatar">{member.name?.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="role-badge">{member.role}</span></article>)}</div>}
            {selectedWorkspace && ["owner", "admin"].includes(selectedWorkspace.role) && <form className="member-invite-form" onSubmit={createInvitation}><h3>Invite someone</h3><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" aria-label="Member email" required /><select aria-label="Member role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select><button className="primary-button" type="submit" disabled={isSaving}>Create invitation</button>{inviteUrl && <a href={inviteUrl} target="_blank" rel="noreferrer">Open invitation</a>}</form>}
            {selectedOrganization && <div className="organization-members-section"><h2>Organization access</h2><p>People and invitations shared across the organization.</p>{organizationMembers.map((member) => <article className="member-card" key={`org-${member.id}`}><span className="member-avatar">{member.name?.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="role-badge">{member.role}</span>{["owner", "admin"].includes(selectedOrganization.role) && member.role !== "owner" && String(member.id) !== String(user.id) && <button className="text-button danger-button" type="button" onClick={() => removeOrganizationMember(member)} disabled={isSaving}>Remove</button>}</article>)}
              {["owner", "admin"].includes(selectedOrganization.role) && <><form className="member-invite-form" onSubmit={inviteOrganizationMember}><h3>Invite to organization</h3><input type="email" aria-label="Organization member email" value={organizationInviteEmail} onChange={(event) => setOrganizationInviteEmail(event.target.value)} placeholder="teammate@company.com" required /><select aria-label="Organization role" value={organizationInviteRole} onChange={(event) => setOrganizationInviteRole(event.target.value)}><option value="employee">Employee</option><option value="manager">Manager</option></select><button className="primary-button" type="submit" disabled={isSaving}>Send invite</button>{organizationInviteUrl && <input aria-label="Organization invitation link" value={organizationInviteUrl} readOnly onFocus={(event) => event.target.select()} />}</form><h3>Pending invitations</h3>{organizationInvitations.map((invitation) => <article className="member-card" key={`invitation-${invitation.id}`}><div><strong>{invitation.email}</strong><small>{invitation.role} · {invitation.status}</small></div>{invitation.status === "pending" && <><button className="text-button" type="button" onClick={() => manageOrganizationInvitation(invitation, "resend")} disabled={isSaving}>Resend</button><button className="text-button danger-button" type="button" onClick={() => manageOrganizationInvitation(invitation, "revoke")} disabled={isSaving}>Revoke</button></>}</article>)}</>}
            </div>}
          </section>}

          {route.key === "project-detail" && <section className="content-panel project-detail-panel">
            {!projectDetail ? <p className="empty-state">Project details are loading…</p> : <>
              <div className="section-heading"><div><h2>{projectDetail.name}</h2><p>{projectDetail.description || "No project description has been added."}</p></div><span className="project-health"><i />{projectDetail.status || "Active"}</span></div>
              <div className="project-detail-summary"><article><span>Progress</span><strong>{projectDetail.progress_percentage ?? 0}%</strong></article><article><span>Tasks</span><strong>{projectDetail.task_count ?? tasks.length}</strong></article><article><span>Completed</span><strong>{projectDetail.completed_task_count ?? tasks.filter((task) => task.status === "completed").length}</strong></article><article><span>Manager</span><strong>{projectDetail.manager_name || "Unassigned"}</strong></article></div>
              <nav className="route-tabs" aria-label="Project sections">{[["overview", "Overview"], ["tasks", "Tasks"], ["board", "Board"], ["members", "Members"], ["activity", "Activity"]].map(([key, label]) => <button type="button" className={projectDetailTab === key ? "active" : ""} key={key} onClick={() => setProjectDetailTab(key)}>{label}</button>)}</nav>
              {projectDetailTab === "overview" && <div className="project-overview-grid"><div><h3>Delivery progress</h3><progress max="100" value={projectDetail.progress_percentage ?? 0} aria-label="Project completion" /><p>{tasks.filter((task) => task.status !== "completed").length} open tasks · {tasks.filter((task) => task.status === "completed").length} completed</p></div><div><h3>Upcoming work</h3>{tasks.filter((task) => task.status !== "completed").slice(0, 5).map((task) => <p key={task.id}><button className="task-title-link" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button> <small>{task.due_date ? dateOnly(task.due_date)?.toLocaleDateString() : "Unscheduled"}</small></p>)}</div></div>}
              {projectDetailTab === "tasks" && <div className="route-task-list">{tasks.map((task) => <article className="route-task-row" key={task.id}><div><button className="task-title-link" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button><small>{task.assignee_name || "Unassigned"} · {task.priority}</small></div><span className="role-badge">{task.status.replaceAll("_", " ")}</span></article>)}</div>}
              {projectDetailTab === "board" && <div className="project-detail-board">{["todo", "in_progress", "in_review", "completed"].map((status) => <section key={status}><h3>{status.replaceAll("_", " ")}</h3>{tasks.filter((task) => task.status === status).map((task) => <button type="button" key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button>)}</section>)}</div>}
              {projectDetailTab === "members" && <><div className="member-directory">{projectMembers.map((member) => <article className="member-card" key={member.user_id}><span className="member-avatar">{member.name?.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="role-badge">{member.role}</span>{["owner", "admin", "manager"].includes(selectedWorkspace?.role) && <button className="text-button danger-button" type="button" onClick={() => removeProjectMember(member)} disabled={isSaving}>Remove</button>}</article>)}</div>{["owner", "admin", "manager"].includes(selectedWorkspace?.role) && <form className="member-invite-form" onSubmit={addProjectMember}><h3>Add project member</h3><select aria-label="Workspace member to add" value={selectedTeamMemberId} onChange={(event) => setSelectedTeamMemberId(event.target.value)} required><option value="">Choose a member</option>{workspaceMembers.filter((member) => !projectMembers.some((projectMember) => String(projectMember.user_id) === String(member.id))).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select><button className="primary-button" type="submit" disabled={isSaving}>Add member</button></form>}</>}
              {projectDetailTab === "activity" && (activityLog.length ? activityLog.map((item) => <article className="activity-item" key={item.id}><span className="activity-dot" /><p><strong>{item.actor_name || "A teammate"}</strong> {item.action} {item.details?.title || "this project"}</p><time>{new Date(item.created_at).toLocaleString()}</time></article>) : <p className="empty-state">No project-specific activity has been recorded.</p>)}
            </>}
          </section>}

          {route.key === "team-detail" && <section className="content-panel team-detail-panel"><div className="section-heading"><div><h2>{teamDetail?.name || "Team"}</h2><p>{teamDetail?.description || "Team members and assigned workspace work."}</p></div></div><div className="project-detail-summary"><article><span>Members</span><strong>{teamMembers.length}</strong></article><article><span>Manager</span><strong>{teams.find((team) => String(team.id) === String(route.id))?.manager_name || "Not assigned"}</strong></article><article><span>Open assignments</span><strong>{workspaceTasks.filter((task) => teamMembers.some((member) => String(member.id) === String(task.assignee_id)) && task.status !== "completed").length}</strong></article></div><h3>Team roster</h3>{teamMembers.length ? <div className="member-directory">{teamMembers.map((member) => <article className="member-card" key={member.id}><span className="member-avatar">{member.name?.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="role-badge">{member.role}</span></article>)}</div> : <p className="empty-state">No members are assigned to this team.</p>}<h3>Assigned work</h3>{workspaceTasks.filter((task) => teamMembers.some((member) => String(member.id) === String(task.assignee_id))).slice(0, 10).map((task) => <article className="route-task-row" key={task.id}><div><button className="task-title-link" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button><small>{task.project_name}</small></div><span className="role-badge">{task.status.replaceAll("_", " ")}</span></article>)}</section>}

          {route.key === "team-detail" && ["owner", "admin", "manager"].includes(selectedWorkspace?.role) && <section className="content-panel team-controls-page">
            <div className="section-heading"><div><h2>Manage team</h2><p>Team administration for workspace managers.</p></div><button className="text-button danger-button" type="button" onClick={() => setDeleteConfirmation({ type: "team", item: teamDetail })} disabled={!teamDetail || isSaving}>Delete team</button></div>
            <form className="profile-settings-form" onSubmit={saveTeamDetails}><label>Team name<input value={teamDetailDraft.name} onChange={(event) => setTeamDetailDraft((current) => ({ ...current, name: event.target.value }))} required /></label><label>Description<textarea value={teamDetailDraft.description} onChange={(event) => setTeamDetailDraft((current) => ({ ...current, description: event.target.value }))} rows="3" /></label><button className="primary-button" type="submit" disabled={isSaving || !teamDetailDraft.name.trim()}>Save team</button></form>
            <form className="member-invite-form" onSubmit={addTeamMember}><h3>Add a team member</h3><select aria-label="Workspace member to add to team" value={selectedTeamMemberId} onChange={(event) => setSelectedTeamMemberId(event.target.value)} required><option value="">Choose a workspace member</option>{workspaceMembers.filter((member) => !teamMembers.some((current) => String(current.id) === String(member.id))).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select><button className="secondary-button" type="submit" disabled={isSaving || !selectedTeamMemberId}>Add member</button></form>
            <h3>Team member access</h3>{teamMembers.map((member) => <article className="member-card" key={`team-manage-${member.id}`}><span className="member-avatar">{member.name?.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="role-badge">{member.role}</span><button className="text-button danger-button" type="button" onClick={() => removeTeamMember(member)} disabled={isSaving}>Remove</button></article>)}
          </section>}
          {route.key === "task-detail" && <section className="content-panel task-detail-page">{!taskDetail ? <p className="empty-state">Task details are loading…</p> : <><div className="section-heading"><div><span className="eyebrow">{taskDetail.project_name || "TASK"}</span><h2>{taskDetail.title}</h2></div><button type="button" className="secondary-button" onClick={() => navigate("/tasks")}>Back to tasks</button></div><form className="task-edit-form" onSubmit={async (event) => { event.preventDefault(); await updateWorkspaceTask(taskDetail, { title: taskDetailDraft.title.trim(), description: taskDetailDraft.description, priority: taskDetailDraft.priority, startDate: taskDetailDraft.startDate || null, dueDate: taskDetailDraft.dueDate || null }); }}><label>Title<input value={taskDetailDraft.title} disabled={! ["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setTaskDetailDraft((current) => ({ ...current, title: event.target.value }))} required /></label><label>Description<textarea value={taskDetailDraft.description} disabled={! ["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setTaskDetailDraft((current) => ({ ...current, description: event.target.value }))} rows="3" /></label><div className="task-detail-fields"><label>Status<select value={taskDetail.status} disabled={isSaving || selectedWorkspace?.role === "viewer"} onChange={(event) => updateWorkspaceTask(taskDetail, { status: event.target.value })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option></select></label><label>Priority<select value={taskDetailDraft.priority} disabled={! ["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setTaskDetailDraft((current) => ({ ...current, priority: event.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Start date<input type="date" value={taskDetailDraft.startDate} disabled={! ["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setTaskDetailDraft((current) => ({ ...current, startDate: event.target.value }))} /></label><label>Due date<input type="date" value={taskDetailDraft.dueDate} disabled={! ["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => setTaskDetailDraft((current) => ({ ...current, dueDate: event.target.value }))} /></label><label>Assignee<select aria-label="Assignee" value={taskDetail.assignee_id || ""} disabled={isSaving || !["owner", "admin", "manager"].includes(selectedWorkspace?.role)} onChange={(event) => updateWorkspaceTask(taskDetail, { assigneeId: event.target.value ? Number(event.target.value) : null })}><option value="">Unassigned</option>{workspaceMembers.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select></label></div>{["owner", "admin", "manager"].includes(selectedWorkspace?.role) && <button className="primary-button" type="submit" disabled={isSaving || !taskDetailDraft.title.trim()}>Save task</button>}</form><h3>Subtasks</h3>{taskDetailSubtasks.map((subtask) => <label className="subtask-row" key={subtask.id}><input type="checkbox" checked={Boolean(subtask.is_completed)} disabled={selectedWorkspace?.role === "viewer" || isSaving} onChange={async (event) => { await runAction(async () => { await apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/subtasks/${subtask.id}`, { method: "PATCH", body: { isCompleted: event.target.checked } }); setTaskDetailSubtasks((current) => current.map((item) => item.id === subtask.id ? { ...item, is_completed: event.target.checked } : item)); }); }} />{subtask.title}</label>)}{!taskDetailSubtasks.length && <p className="empty-state">No subtasks.</p>}{selectedWorkspace?.role !== "viewer" && <form className="member-invite-form" onSubmit={async (event) => { event.preventDefault(); if (!subtaskTitle.trim()) return; await runAction(async () => { const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/subtasks`, { method: "POST", body: { title: subtaskTitle.trim() } }); setTaskDetailSubtasks((current) => [...current, result.subtask]); setSubtaskTitle(""); }); }}><input aria-label="New subtask" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add a subtask" required /><button className="secondary-button" type="submit" disabled={isSaving}>Add subtask</button></form>}<h3>Comments</h3>{taskDetailComments.map((comment) => <p className="task-comment" key={comment.id}><strong>{comment.author_name || "Teammate"}</strong> {comment.body}</p>)}{selectedWorkspace?.role !== "viewer" && <form className="member-invite-form" onSubmit={async (event) => { event.preventDefault(); if (!commentDraft.trim()) return; await runAction(async () => { const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/comments`, { method: "POST", body: { body: commentDraft.trim() } }); setTaskDetailComments((current) => [...current, result.comment]); setCommentDraft(""); }); }}><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Write a comment" aria-label="Task comment" required /><button className="primary-button" type="submit" disabled={isSaving}>Comment</button></form>}<h3>Attachments</h3>{taskDetailAttachments.map((attachment) => <button className="text-button" type="button" key={attachment.id} onClick={() => retrieveTaskAttachment(taskDetail, attachment)}>{attachment.original_name}</button>)}{!taskDetailAttachments.length && <p className="empty-state">No attachments.</p>}{selectedWorkspace?.role !== "viewer" && <label className="secondary-button upload-attachment-button">Upload attachment<input type="file" onChange={async (event) => { await uploadTaskAttachment(event, taskDetail); const result = await apiRequest(`/workspaces/${workspaceId}/tasks/${route.id}/attachments`); setTaskDetailAttachments(result.attachments); }} /></label>}<h3>Activity</h3>{taskDetailActivity.length ? taskDetailActivity.map((item) => <article className="activity-item" key={item.id}><span className="activity-dot" /><p><strong>{item.actor_name || "Teammate"}</strong> {item.action}</p><time>{new Date(item.created_at).toLocaleString()}</time></article>) : <p className="empty-state">Task activity will appear here.</p>}</>}</section>}

          {route.key === "tasks" && <section className="content-panel all-tasks-page"><div className="section-heading"><div><h2>All accessible tasks</h2><p>Workspace tasks returned by your membership-scoped API.</p></div></div><form className="task-filter-toolbar" onSubmit={(event) => event.preventDefault()}><input aria-label="Search all tasks" value={taskPageSearch} onChange={(event) => setTaskPageSearch(event.target.value)} placeholder="Search tasks" /><select aria-label="Filter by status" value={taskPageStatus} onChange={(event) => setTaskPageStatus(event.target.value)}><option value="">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option></select><select aria-label="Filter by priority" value={taskPagePriority} onChange={(event) => setTaskPagePriority(event.target.value)}><option value="">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select aria-label="Filter by project" value={taskPageProject} onChange={(event) => setTaskPageProject(event.target.value)}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></form>{["owner", "admin", "manager"].includes(selectedWorkspace?.role) && <form className="task-filter-toolbar task-create-form" onSubmit={createWorkspaceTask}><input value={taskPageTitle} onChange={(event) => setTaskPageTitle(event.target.value)} placeholder="Task title" aria-label="New task title" required /><select aria-label="Project for new task" value={taskPageProjectId || selectedProjectId || ""} onChange={(event) => setTaskPageProjectId(event.target.value)} required><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button className="primary-button" type="submit" disabled={isSaving}>Create task</button></form>}{workspaceTasks.length ? <div className="route-task-list">{workspaceTasks.map((task) => <article className="route-task-row" key={task.id}><div><button className="task-title-link" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button><small>{task.project_name} · {task.assignee_name || "Unassigned"} · {task.due_date ? dateOnly(task.due_date)?.toLocaleDateString() : "No due date"}</small></div><span className={`priority-pill priority-${task.priority}`}>{task.priority}</span><select aria-label={`Status for ${task.title}`} value={task.status} disabled={isSaving || (! ["owner", "admin", "manager"].includes(selectedWorkspace?.role) && String(task.assignee_id) !== String(user.id))} onChange={(event) => updateWorkspaceTask(task, { status: event.target.value })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option></select></article>)}</div> : !isLoadingRoute && <p className="empty-state">No tasks match the current filters.</p>}</section>}

          {route.key === "board" && <section className="content-panel workspace-board-page"><div className="section-heading"><div><h2>Workspace board</h2><p>Drag cards between stages or use the status selector for keyboard and touch control.</p></div></div><div className="project-toolbar"><select aria-label="Filter board by project" value={taskPageProject} onChange={(event) => setTaskPageProject(event.target.value)}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input aria-label="Search board tasks" value={taskPageSearch} onChange={(event) => setTaskPageSearch(event.target.value)} placeholder="Search tasks" /></div><div className="kanban-board">{[["todo", "To do"], ["in_progress", "In progress"], ["in_review", "In review"], ["completed", "Completed"]].map(([status, label]) => <section className="kanban-column" key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const moving = workspaceTasks.find((item) => String(item.id) === String(draggedTaskId)); if (moving) updateWorkspaceTask(moving, { status }); setDraggedTaskId(null); }}><header><strong>{label}</strong><span>{workspaceTasks.filter((task) => task.status === status).length}</span></header>{workspaceTasks.filter((task) => task.status === status).map((task) => <article className="kanban-card" key={task.id} draggable={selectedWorkspace?.role !== "viewer" && (["owner", "admin", "manager"].includes(selectedWorkspace?.role) || String(task.assignee_id) === String(user.id))} onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)}><button className="task-title-link" type="button" onClick={() => navigate(`/tasks/${task.id}`)}>{task.title}</button><small>{task.project_name} · {task.assignee_name || "Unassigned"}</small><select aria-label={`Move ${task.title} to status`} value={task.status} disabled={isSaving || (! ["owner", "admin", "manager"].includes(selectedWorkspace?.role) && String(task.assignee_id) !== String(user.id))} onChange={(event) => updateWorkspaceTask(task, { status: event.target.value })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option></select></article>)}</section>)}</div></section>}

          {route.key === "reports" && <section className="content-panel route-reports-page"><div className="section-heading"><div><h2>Workspace analytics</h2><p>Calculated from stored workspace, project, and team activity.</p></div><button className="secondary-button" type="button" onClick={exportAnalyticsCsv} disabled={isSaving}>Export CSV</button></div>{!organizationAnalytics ? <p className="empty-state">Analytics are not available for this workspace.</p> : <><div className="project-detail-summary"><article><span>Tasks</span><strong>{organizationAnalytics.metrics.task_count}</strong></article><article><span>Completion</span><strong>{organizationAnalytics.metrics.completion_rate}%</strong></article><article><span>On time</span><strong>{organizationAnalytics.metrics.on_time_completion_rate}%</strong></article><article><span>Overdue</span><strong>{organizationAnalytics.metrics.overdue_tasks}</strong></article></div><h3>Completion trend</h3><div className="trend-bars">{organizationAnalytics.trends.map((month) => <div key={month.month}><span>{month.completed_tasks}</span><div style={{ height: `${Math.max(5, (month.completed_tasks / Math.max(1, ...organizationAnalytics.trends.map((item) => item.completed_tasks))) * 100)}%` }} /><small>{String(month.month).slice(0, 7)}</small></div>)}</div>{projectAnalytics && <><h3>Selected project</h3><p>{projectAnalytics.metrics.task_count} tasks · {projectAnalytics.metrics.completion_rate}% complete · {projectAnalytics.metrics.overdue_tasks} overdue</p></>}{teamProductivity.filter(({ team }) => !reportTeamFilter || String(team.id) === String(reportTeamFilter)).map(({ team, result }) => <section className="team-report" key={team.id}><h3>{team.name}</h3>{result.productivity.map((member) => <p key={member.user_id}>{member.name} · {member.completed_tasks}/{member.task_count} complete · {formatDuration(member.tracked_seconds)}</p>)}</section>)}</>}</section>}

          {route.key === "time" && <section className="content-panel time-tracking-page"><div className="section-heading"><div><h2>Time tracking</h2><p>Recorded task sessions and project totals.</p></div></div>{activeWorkspaceTimer ? <div className="active-timer-card"><span className="timer-live-dot" />Tracking <strong>{activeWorkspaceTimer.task_title}</strong><button className="primary-button" type="button" onClick={() => stopTaskTimer({ id: activeWorkspaceTimer.task_id }, activeWorkspaceTimer)} disabled={isSaving}>Stop timer</button></div> : <p className="empty-state">No timer is running.</p>}<h3>Start a timer</h3><div className="route-task-list">{workspaceTasks.filter((task) => task.status !== "completed").slice(0, 30).map((task) => <article className="route-task-row" key={task.id}><div><strong>{task.title}</strong><small>{task.project_name} · {task.assignee_name || "Unassigned"}</small></div><button className="secondary-button" type="button" disabled={isSaving || isLoadingRoute || !timeReports || selectedWorkspace?.role === "viewer" || Boolean(activeWorkspaceTimer)} onClick={() => startTaskTimer(task)}>Start</button><button className="text-button" type="button" onClick={() => toggleTaskTime(task)}>{String(openTimeTaskId) === String(task.id) ? "Hide entries" : "Time entries"}</button>{String(openTimeTaskId) === String(task.id) && <div className="time-entry-list">{(taskTimeData[task.id]?.entries || []).map((entry) => <p key={entry.id}>{entry.user_name || "Teammate"} · {new Date(entry.started_at).toLocaleString()} · {formatDuration(entry.duration_seconds)}</p>)}</div>}</article>)}</div><h3>Project summaries</h3>{timeReports?.projects?.map((project) => <article className="route-task-row" key={project.project_id}><strong>{project.project_name}</strong><span>{formatDuration(project.total_seconds)}</span></article>)}</section>}

          {route.key === "settings" && <section className="content-panel route-settings-page"><div className="section-heading"><div><h2>Workspace settings</h2><p>Manage supported account and workspace preferences.</p></div></div><div className="settings-section"><h3>Appearance</h3><p>Choose how ProjectFlow looks on this device.</p><button className="secondary-button" type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>{theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}</button></div><div className="settings-section"><h3>Notifications</h3>{[["assignment_enabled", "assignmentEnabled", "Assignments"], ["mention_enabled", "mentionEnabled", "Mentions"], ["due_date_enabled", "dueDateEnabled", "Due-date reminders"]].map(([column, field, label]) => <label className="settings-checkbox" key={column}><input type="checkbox" checked={notificationPreferences[column]} onChange={(event) => updateNotificationPreference(field, event.target.checked)} />{label}</label>)}</div><div className="settings-section"><h3>Organization</h3>{selectedOrganization && <><p>{selectedOrganization.name} · {selectedOrganization.role}</p>{["owner", "admin"].includes(selectedOrganization.role) && <form className="member-invite-form" onSubmit={renameOrganization}><input aria-label="Organization name" value={organizationEditName} onChange={(event) => setOrganizationEditName(event.target.value)} required /><button className="secondary-button" type="submit" disabled={isSaving}>Save organization name</button></form>}</>}</div><div className="settings-section"><h3>Workspace</h3><p>{selectedWorkspace?.name || "No workspace selected"} · {selectedWorkspace?.role || ""}</p>{["owner", "admin"].includes(selectedWorkspace?.role) && <form className="member-invite-form" onSubmit={(event) => updateWorkspace(event, selectedWorkspace)}><input aria-label="Workspace name" value={workspaceEditName || selectedWorkspace.name} onChange={(event) => setWorkspaceEditName(event.target.value)} required /><button className="secondary-button" type="submit" disabled={isSaving}>Save workspace name</button></form>}</div><div className="settings-section"><h3>Members</h3><p>Member administration is available on the Members page.</p><button className="secondary-button" type="button" onClick={() => navigate("/members")}>Manage members</button></div></section>}

          {route.key === "profile" && <section className="content-panel route-profile-page"><div className="section-heading"><div><h2>My profile</h2><p>Profile name and account security.</p></div></div>{profileNotice && <p className="form-notice" role="status">{profileNotice}</p>}<form className="profile-settings-form" onSubmit={saveProfile}><label>Name<input value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} maxLength="100" required /></label><label>Email<input value={profileDraft.email} readOnly aria-readonly="true" /><small>Email changes are not supported by the current account API.</small></label><button className="primary-button" type="submit" disabled={isSaving || !profileDraft.name.trim()}>Save profile</button></form><form className="profile-settings-form" onSubmit={changeAccountPassword}><h3>Change password</h3><label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>New password<input type="password" minLength="8" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label><button className="secondary-button" type="submit" disabled={isSaving || newPassword.length < 8}>Update password</button></form></section>}

          {route.key === "reports" && <form className="reports-filter-panel content-panel"><label>Project <select aria-label="Analytics project" value={selectedProjectId || ""} onChange={(event) => setSelectedProjectId(event.target.value || null)}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Team <select aria-label="Analytics team" value={reportTeamFilter} onChange={(event) => setReportTeamFilter(event.target.value)}><option value="">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><small>Trend range: last six months (the analytics API defines this range).</small></form>}
          {route.key === "time" && <form className="content-panel time-filter-panel" onSubmit={(event) => event.preventDefault()}><label>From <input type="date" value={timeFromDate} onChange={(event) => setTimeFromDate(event.target.value)} /></label><label>To <input type="date" min={timeFromDate || undefined} value={timeToDate} onChange={(event) => setTimeToDate(event.target.value)} /></label><button className="text-button" type="button" onClick={() => { setTimeFromDate(""); setTimeToDate(""); }}>Last 30 days</button></form>}

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

          {activeNav === "my-work" && <section className="content-panel my-day-panel" aria-labelledby="my-day-title">
            <div className="section-heading"><div><div className="eyebrow">MY DAY</div><h2 id="my-day-title">A clear view of what needs you</h2><p>Your assigned work for today, based on the selected project.</p></div></div>
            <div className="my-day-stats">
              <article><span>Overdue</span><strong>{myOverdueTasks.length}</strong></article>
              <article><span>Due today</span><strong>{myDueTodayTasks.length}</strong></article>
              <article><span>Completed</span><strong>{myCompletedTasks.length}</strong></article>
            </div>
            {myAssignedTasks.filter((task) => task.status !== "completed").length === 0
              ? <p className="empty-state">No open tasks assigned to you in this project.</p>
              : <div className="my-day-list">{myAssignedTasks.filter((task) => task.status !== "completed").slice(0, 6).map((task) => <article className="my-day-task" key={task.id}>
                <span className="my-day-task-copy"><strong>{task.title}</strong><small>{task.due_date ? `Due ${dateOnly(task.due_date)?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No due date"}</small></span>
                <select aria-label={`Update status for ${task.title}`} value={task.status} disabled={isSaving || (! ["owner", "admin", "manager"].includes(selectedWorkspace?.role) && String(task.assignee_id) !== String(user.id))} onChange={(event) => updateTask(task, event.target.value)}>
                  <option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="completed">Completed</option>
                </select>
              </article>)}</div>}
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

            <article className="overview-card"><span>Workspace members</span><div className="metric-value">{dashboard?.user_count ?? 0}</div></article>
            <article className="overview-card"><span>Overdue tasks</span><div className="metric-value">{dashboard?.overdue_tasks ?? 0}</div></article>
            <article className="overview-card"><span>Active projects</span><div className="metric-value">{dashboard?.active_projects ?? 0}</div></article>

          </div>

          {route.key === "dashboard" && <section className="content-panel dashboard-role-panel"><div className="section-heading"><div><h2>{selectedWorkspace?.role === "employee" || selectedWorkspace?.role === "viewer" ? "Your workload" : "Team workload"}</h2><p>{selectedWorkspace?.role === "employee" || selectedWorkspace?.role === "viewer" ? "Your open assignments and due dates." : "Current assignments by workspace member."}</p></div></div>{selectedWorkspace?.role === "employee" || selectedWorkspace?.role === "viewer" ? <div className="my-day-stats"><article><span>Overdue</span><strong>{myWorkData?.stats?.overdue ?? 0}</strong></article><article><span>Due today</span><strong>{myWorkData?.stats?.dueToday ?? 0}</strong></article><article><span>Upcoming</span><strong>{myWorkData?.stats?.upcoming ?? 0}</strong></article></div> : <div className="workload-table"><div className="workload-header"><strong>Member</strong><strong>Tasks</strong><strong>Overdue</strong><strong>Next 7 days</strong><strong>Tracked</strong></div>{workload.map((member, index) => <div className="workload-row" key={member.assignee_id || `unassigned-${index}`}><strong>{member.assignee_name || "Unassigned"}</strong><span>{member.task_count}</span><span>{member.overdue_tasks}</span><span>{member.upcoming_tasks}</span><span>{formatDuration(member.tracked_seconds)}</span></div>)}</div>}</section>}

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

          <section className="content-panel project-list-panel">

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
                          setTaskPageProjectId(String(project.id));
                          navigate(`/projects/${project.id}`);
                          refreshTasks(project.id).catch((requestError) =>
                            setError(requestError.message)
                          );
                          if (timelineMode) loadTimeline(project.id).catch((requestError) => setError(requestError.message));
                        }}
                      >
                        {project.name}
                      </button>
                      <span className={`project-health project-health-${getProjectHealth(project).label.toLowerCase().replace(" ", "-")}`}><i />{getProjectHealth(project).label}</span>
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

          <section className="content-panel team-list-panel">
            <div className="section-heading"><div><h2>Teams</h2><p>Organize workspace members and assign team ownership.</p></div></div>
            <div className="team-directory-links">{teams.map((team) => <button className="team-directory-card" type="button" key={team.id} onClick={() => navigate(`/teams/${team.id}`)}><strong>{team.name}</strong><small>{team.member_count} members · {team.manager_name || "No manager"}</small><span>Open team →</span></button>)}</div>
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

          <section className="content-panel task-workspace-panel">

            <div className="section-heading">
              <h2>Tasks</h2>
              <div className="view-switch" role="group" aria-label="Task view">
                <button className={`secondary-button ${!routeBoardMode && !routeCalendarMode && !routeTimelineMode ? "active" : ""}`} onClick={() => { setCalendarMode(false); setTimelineMode(false); setBoardMode(false); }} type="button">List</button>
                <button className={`secondary-button ${routeBoardMode ? "active" : ""}`} onClick={() => { setCalendarMode(false); setTimelineMode(false); setBoardMode(true); }} type="button">Board</button>
                <button className={`secondary-button ${routeCalendarMode ? "active" : ""}`} onClick={() => { setCalendarMode(true); setTimelineMode(false); setBoardMode(false); }} type="button">Calendar</button>
                <button className={`secondary-button ${routeTimelineMode ? "active" : ""}`} onClick={() => setActiveNav("timeline")} type="button">Timeline</button>
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
                {teamProductivity.filter(({ team }) => !reportTeamFilter || String(team.id) === String(reportTeamFilter)).map(({ team, result }) => (
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
            {routeTimelineMode ? (
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
            ) : routeCalendarMode ? (
              <section className="task-calendar" aria-label="Task calendar">
                <div className="calendar-toolbar">
                  <div className="calendar-navigation">
                    <button className="secondary-button" type="button" aria-label="Previous period" onClick={() => setCalendarCursor((current) => {
                      if (calendarPeriod === "month") return new Date(current.getFullYear(), current.getMonth() - 1, 1);
                      return new Date(current.getFullYear(), current.getMonth(), current.getDate() - (["week", "agenda"].includes(calendarPeriod) ? 7 : 1));
                    })}>Previous</button>
                    <h3>{calendarTitle}</h3>
                    <button className="secondary-button" type="button" aria-label="Next period" onClick={() => setCalendarCursor((current) => {
                      if (calendarPeriod === "month") return new Date(current.getFullYear(), current.getMonth() + 1, 1);
                      return new Date(current.getFullYear(), current.getMonth(), current.getDate() + (["week", "agenda"].includes(calendarPeriod) ? 7 : 1));
                    })}>Next</button>
                    <button className="secondary-button" type="button" onClick={() => setCalendarCursor(new Date())}>Today</button>
                  </div>
                  <select aria-label="Calendar period" value={calendarPeriod} onChange={(event) => setCalendarPeriod(event.target.value)}>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                    <option value="agenda">Agenda</option>
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
            ) : routeBoardMode ? (
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

      {showCommandPalette && (
        <div
          className="command-palette-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCommandPalette(false);
          }}
        >
          <div className="command-palette-box" role="dialog" aria-modal="true" aria-label="Command Palette">
            <div className="command-palette-input-wrap">
              <Search size={18} color="var(--text-muted)" />
              <input
                className="command-palette-input"
                autoFocus
                value={paletteQuery}
                onChange={(e) => { setPaletteQuery(e.target.value); setGlobalSearchResults({ projects: [], tasks: [], members: [] }); }}
                placeholder="Type a command, project, or task name..."
              />
              <button
                type="button"
                className="icon-btn"
                style={{ width: "24px", height: "24px", border: "none" }}
                onClick={() => setShowCommandPalette(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="command-palette-results">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", padding: "4px 8px" }}>
                NAVIGATION
              </div>
              {!paletteQuery.trim() ? <>
                <div className="palette-group-label">NAVIGATION</div>
                {[
                  { label: "Dashboard", icon: LayoutDashboard, nav: "dashboard" },
                  { label: "Inbox", icon: Mail, nav: "inbox" },
                  { label: "My Work", icon: CheckSquare, nav: "my-work" },
                  { label: "Projects", icon: FolderKanban, nav: "projects" },
                  { label: "My Tasks", icon: ListTodo, nav: "tasks" },
                  { label: "Kanban Board", icon: Columns3, nav: "board" },
                  { label: "Calendar", icon: CalendarIcon, nav: "calendar" },
                  { label: "Timeline", icon: Milestone, nav: "timeline" },
                  { label: "Teams", icon: Users, nav: "teams" },
                  { label: "Members", icon: Contact, nav: "members" },
                  { label: "Reports", icon: BarChart3, nav: "reports" },
                  { label: "Time Tracking", icon: Clock, nav: "time" },
                  { label: "Settings", icon: SettingsIcon, nav: "settings" },
                  { label: "My Profile", icon: UserRound, nav: "profile" },
                ].map((item) => <button key={item.nav} className="command-palette-item" type="button" onClick={() => { setActiveNav(item.nav); setShowCommandPalette(false); }}><span><item.icon size={16} />{item.label}</span><small>Open</small></button>)}
              </> : <>
                {isGlobalSearchLoading && <p className="loading-message" role="status">Searching workspace…</p>}
                {globalSearchResults.projects.length > 0 && <><div className="palette-group-label">PROJECTS</div>{globalSearchResults.projects.map((project) => <button className="command-palette-item" type="button" key={project.id} onClick={() => { navigate(`/projects/${project.id}`); setShowCommandPalette(false); }}><span><FolderKanban size={16} />{project.name}</span><small>{project.status}</small></button>)}</>}
                {globalSearchResults.tasks.length > 0 && <><div className="palette-group-label">TASKS</div>{globalSearchResults.tasks.map((task) => <button className="command-palette-item" type="button" key={task.id} onClick={() => { navigate(`/tasks/${task.id}`); setShowCommandPalette(false); }}><span><CheckCircle2 size={16} />{task.title}</span><small>{task.project_name}</small></button>)}</>}
                {globalSearchResults.members.length > 0 && <><div className="palette-group-label">MEMBERS</div>{globalSearchResults.members.map((member) => <button className="command-palette-item" type="button" key={member.id} onClick={() => { navigate("/members"); setShowCommandPalette(false); }}><span><Contact size={16} />{member.name}</span><small>{member.role}</small></button>)}</>}
                {!isGlobalSearchLoading && !globalSearchResults.projects.length && !globalSearchResults.tasks.length && !globalSearchResults.members.length && <p className="empty-state">No matching projects, tasks, or members.</p>}
              </>}
            </div>
            <div className="command-palette-footer">
              <span>Tab to move · Enter to open</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
