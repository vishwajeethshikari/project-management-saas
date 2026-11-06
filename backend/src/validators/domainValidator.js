const { z } = require("zod");

const positiveId = z.coerce.number().int().positive();
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();

const workspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const invitationSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["in_progress", "completed", "archived"]).default("in_progress"),
  ownerId: positiveId.nullable().optional(),
  dueDate: optionalDate,
});

const projectUpdateSchema = projectCreateSchema.partial();

const taskCreateSchema = z.object({
  projectId: positiveId,
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigneeId: positiveId.nullable().optional(),
  dueDate: optionalDate,
});

const taskUpdateSchema = taskCreateSchema.partial().omit({ projectId: true });
const commentSchema = z.object({ body: z.string().trim().min(1).max(4000) });
const notificationReadSchema = z.object({ isRead: z.boolean() });

module.exports = {
  positiveId,
  profileSchema,
  workspaceSchema,
  invitationSchema,
  projectCreateSchema,
  projectUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
  commentSchema,
  notificationReadSchema,
};
