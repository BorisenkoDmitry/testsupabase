import { z } from "zod";
const status = z.enum(["new", "in_progress", "review", "revision", "accepted"]);
const task = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  object_id: z.string(),
  assignee_id: z.string(),
  author_id: z.string(),
  status,
  created_at: z.string(),
  version: z.number().int().positive(),
  object_name: z.string(),
  assignee_name: z.string(),
});
const object = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  created_at: z.string(),
  version: z.number().int().positive(),
  task_count: z.number().int().nonnegative(),
  accepted_count: z.number().int().nonnegative(),
  review_count: z.number().int().nonnegative(),
});
const metadata = {
  total: z.number().int().nonnegative(),
  pageIndex: z.number().int().nonnegative(),
  pageSize: z.number().int().min(1).max(100),
};
export const taskPageSchema = z.object({
  ...metadata,
  items: z.array(task),
  summary: z.object({
    total: z.number(),
    newCount: z.number(),
    inProgressCount: z.number(),
    reviewCount: z.number(),
  }),
});
export const objectPageSchema = z.object({
  ...metadata,
  items: z.array(object),
  summary: z.object({
    objectCount: z.number(),
    activeTaskCount: z.number(),
    reviewCount: z.number(),
  }),
});
export const profileListSchema = z.array(
  z.object({
    id: z.string(),
    full_name: z.string(),
    email: z.string(),
    role: z.enum(["manager", "executor"]),
    is_active: z.boolean(),
  }),
);
export const objectOptionsSchema = z.array(
  z.object({ id: z.string(), name: z.string() }),
);
export const historyPageSchema = z.object({
  ...metadata,
  items: z.array(
    z.object({
      id: z.string(),
      task_id: z.string(),
      actor_id: z.string(),
      from_status: status.nullable(),
      to_status: status,
      comment: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
});
