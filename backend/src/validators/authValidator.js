const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password must be at most 72 bytes",
  });

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    { message: "Password must be at most 72 bytes" }
  ),
});

module.exports = { registerSchema, loginSchema };
