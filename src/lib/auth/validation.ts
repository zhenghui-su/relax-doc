import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "密码至少需要 8 位。"),
});

export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "昵称至少需要 2 个字符。")
    .max(32, "昵称长度不能超过 32 个字符。")
    .optional()
    .or(z.literal("")),
});

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "文档标题不能为空。")
    .max(120, "文档标题不能超过 120 个字符。")
    .optional()
    .default("未命名文档"),
  parentId: z.string().cuid().optional().or(z.literal("")),
});

export const updateDocumentTitleSchema = z.object({
  documentId: z.string().cuid(),
  title: z
    .string()
    .trim()
    .min(1, "标题不能为空。")
    .max(120, "标题不能超过 120 个字符。"),
});

export const documentStateSchema = z.object({
  documentId: z.string().cuid(),
});

export const moveDocumentSchema = z.object({
  documentId: z.string().cuid(),
  parentId: z.string().cuid().nullable(),
});

export const inviteMemberSchema = z.object({
  documentId: z.string().cuid(),
  email: z.email().trim().toLowerCase(),
  role: z.enum(["editor", "viewer"]),
});

export const updateMemberRoleSchema = z.object({
  documentId: z.string().cuid(),
  memberId: z.string().cuid(),
  role: z.enum(["editor", "viewer"]),
});

export const removeMemberSchema = z.object({
  documentId: z.string().cuid(),
  memberId: z.string().cuid(),
});

export const shareLinkSchema = z.object({
  documentId: z.string().cuid(),
  role: z.enum(["editor", "viewer", "disabled"]),
});

export const disableShareLinkSchema = z.object({
  documentId: z.string().cuid(),
  linkId: z.string().cuid(),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  data?: Record<string, string | boolean | undefined>;
};

export const emptyFormState: FormState = {};
