const { z } = require("zod");

const positiveId = z.coerce.number().int().positive();
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date")
  .nullable().optional();

const workspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
});
const workspaceCreateSchema = workspaceSchema.extend({ organizationId: positiveId.optional() });
const organizationSchema = z.object({ name: z.string().trim().min(1).max(120) });
const organizationInvitationSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "employee", "viewer"]).default("employee"),
});
const organizationInvitationAcceptSchema = z.object({ token: z.string().trim().length(64) });

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  avatarUrl: z.string().trim().url().max(1000).nullable().optional(),
});

const invitationSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "member", "employee", "viewer"]).default("member"),
});
const invitationAcceptSchema = z.object({ token: z.string().trim().length(64) });

const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["in_progress", "completed", "archived"]).default("in_progress"),
  ownerId: positiveId.nullable().optional(),
  managerId: positiveId.nullable().optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
});

const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["in_progress", "completed", "archived"]).optional(),
  ownerId: positiveId.nullable().optional(),
  managerId: positiveId.nullable().optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
});

const projectMemberSchema = z.object({
  userId: positiveId,
  role: z.enum(["manager", "member", "viewer"]).default("member"),
});

const labelSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().max(30).default("#3b82f6"),
});

const taskCreateSchema = z.object({
  projectId: positiveId,
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  estimatedMinutes: z.number().int().min(0).max(525600).nullable().optional(),
  startDate: optionalDate,
  assigneeId: positiveId.nullable().optional(),
  dueDate: optionalDate,
});

const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  estimatedMinutes: z.number().int().min(0).max(525600).nullable().optional(),
  assigneeId: positiveId.nullable().optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
});
const taskListQuerySchema = z.object({
  search: z.string().max(200).optional().default(""),
  status: z.enum(["todo", "in_progress", "in_review", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: positiveId.optional(),
  sort: z.enum(["created_at", "due_date", "priority", "title"]).optional().default("created_at"),
});
const commentSchema = z.object({ body: z.string().trim().min(1).max(4000) });
const timeEntryDateTime = z.string().datetime({ offset: true });
const timeEntryCreateSchema = z.object({
  startedAt: timeEntryDateTime,
  endedAt: timeEntryDateTime,
  note: z.string().trim().max(1000).nullable().optional(),
}).refine(({ startedAt, endedAt }) => {
  const duration = Date.parse(endedAt) - Date.parse(startedAt);
  return duration > 0 && duration <= 31 * 24 * 60 * 60 * 1000;
}, "Time entries must be positive and no longer than 31 days");
const timeEntryUpdateSchema = z.object({
  startedAt: timeEntryDateTime.optional(),
  endedAt: timeEntryDateTime.optional(),
  note: z.string().trim().max(1000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one time entry field to update");
const timeReportQuerySchema = z.object({
  fromDate: optionalDate,
  toDate: optionalDate,
}).refine(({ fromDate, toDate }) => !fromDate || !toDate || fromDate <= toDate, "fromDate must be on or before toDate");
const recurringTaskCreateSchema = z.object({
  projectId: positiveId,
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  recurrenceUnit: z.enum(["daily", "weekly", "monthly"]),
  intervalCount: z.number().int().min(1).max(365).default(1),
  startsAt: timeEntryDateTime,
  endsAt: timeEntryDateTime.nullable().optional(),
  monthDay: z.number().int().min(1).max(31).optional(),
  assigneeId: positiveId.nullable().optional(),
  dueOffsetDays: z.number().int().min(0).max(3650).nullable().optional(),
}).refine(({ startsAt, endsAt }) => !endsAt || Date.parse(endsAt) >= Date.parse(startsAt), {
  path: ["endsAt"],
  message: "Recurrence end must be on or after its start",
});
const milestoneCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  dueDate: optionalDate,
});
const milestoneUpdateSchema = milestoneCreateSchema.partial().extend({
  isCompleted: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one milestone field to update");
const notificationReadSchema = z.object({ isRead: z.boolean() });
const subtaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(255),
  assigneeId: positiveId.nullable().optional(),
  dueDate: optionalDate,
});
const subtaskUpdateSchema = subtaskCreateSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});
const teamSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  managerId: positiveId.nullable().optional(),
});
const teamMemberSchema = z.object({
  userId: positiveId,
  role: z.literal("employee").default("employee"),
});
const passwordResetRequestSchema = z.object({ email: z.string().trim().email().max(254) });
const passwordResetSchema = z.object({
  token: z.string().trim().min(32).max(200),
  password: z.string().min(8).max(128),
});

module.exports = {
  positiveId,
  profileSchema,
  workspaceSchema,
  workspaceCreateSchema,
  organizationSchema,
  organizationInvitationSchema,
  organizationInvitationAcceptSchema,
  invitationSchema,
  invitationAcceptSchema,
  projectCreateSchema,
  projectUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
  taskListQuerySchema,
  commentSchema,
  timeEntryCreateSchema,
  timeEntryUpdateSchema,
  timeReportQuerySchema,
  recurringTaskCreateSchema,
  milestoneCreateSchema,
  milestoneUpdateSchema,
  notificationReadSchema,
  subtaskCreateSchema,
  subtaskUpdateSchema,
  teamSchema,
  teamMemberSchema,
  projectMemberSchema,
  labelSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
};
