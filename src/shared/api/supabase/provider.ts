import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CrmApi,
  ConstructionObject,
  Task,
  TaskHistory,
  User,
} from "../contracts";
import { apiError, CrmError } from "../errors";
import type { Database } from "./database.types";
import {
  taskPageSchema,
  objectPageSchema,
  profileListSchema,
  objectOptionsSchema,
  historyPageSchema,
} from "./list-schemas";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
const objectDto = (
  r: Pick<Row<"objects">, "id" | "name" | "address" | "created_at" | "version">,
): ConstructionObject => ({
  id: r.id,
  name: r.name,
  address: r.address,
  createdAt: r.created_at,
  version: r.version,
});
const taskDto = (
  r: Pick<
    Row<"tasks">,
    | "id"
    | "title"
    | "description"
    | "object_id"
    | "assignee_id"
    | "author_id"
    | "status"
    | "created_at"
    | "version"
  >,
): Task => ({
  id: r.id,
  title: r.title,
  description: r.description,
  objectId: r.object_id,
  assigneeId: r.assignee_id,
  authorId: r.author_id,
  status: r.status,
  createdAt: r.created_at,
  version: r.version,
});
const userDto = (
  r: Pick<Row<"profiles">, "id" | "full_name" | "email" | "role" | "is_active">,
): User => ({
  id: r.id,
  name: r.full_name,
  email: r.email,
  role: r.role,
  isActive: r.is_active,
});
const historyDto = (r: Row<"task_history">): TaskHistory => ({
  id: r.id,
  taskId: r.task_id,
  actorId: r.actor_id,
  fromStatus: r.from_status,
  toStatus: r.to_status,
  comment: r.comment,
  createdAt: r.created_at,
});

function expected(version?: number): number {
  if (!Number.isSafeInteger(version) || version! < 1)
    throw new CrmError("Неизвестна версия записи. Обновите страницу.", "40001");
  return version!;
}
async function result<T>(
  request: PromiseLike<{
    data: T | null;
    error: { message: string; code?: string } | null;
  }>,
): Promise<T> {
  const { data, error } = await request;
  if (error) throw apiError(error);
  if (data === null)
    throw new CrmError("Запись не найдена или доступ ограничен.");
  return data;
}

export function createSupabaseApi(client: SupabaseClient<Database>): CrmApi {
  async function profile(id: string): Promise<User> {
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw apiError(error);
    if (!data?.is_active) {
      await client.auth.signOut({ scope: "local" });
      throw new CrmError(
        "Доступ к CRM не выдан или отключён. Обратитесь к администратору.",
      );
    }
    return userDto(data);
  }
  return {
    auth: {
      async getSession() {
        const { data, error } = await client.auth.getSession();
        if (error) throw apiError(error);
        if (!data.session) return null;
        const verified = await client.auth.getUser();
        if (verified.error) {
          if (verified.error.status === 401 || verified.error.status === 403) {
            await client.auth.signOut({ scope: "local" });
            return null;
          }
          throw apiError(verified.error);
        }
        return profile(verified.data.user.id);
      },
      async signIn(email, password) {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw apiError(error);
        return profile(data.user.id);
      },
      async signOut() {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw apiError(error);
      },
      onSessionChange(listener) {
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const { data } = client.auth.onAuthStateChange((event) => {
          if (event === "INITIAL_SESSION") return;
          // Run outside the Auth lock; querying Auth inside the callback can deadlock.
          const timer = setTimeout(() => {
            timers.delete(timer);
            listener();
          }, 0);
          timers.add(timer);
        });
        return () => {
          data.subscription.unsubscribe();
          timers.forEach(clearTimeout);
        };
      },
    },
    users: {
      async list(assigneesOnly = false, signal) {
        const data = await result(
          client
            .rpc(
              "crm_list_options",
              { p_kind: assigneesOnly ? "assignees" : "profiles" },
              { get: true },
            )
            .abortSignal(signal ?? AbortSignal.timeout(30000)),
        );
        return profileListSchema.parse(data).map(userDto);
      },
    },
    objects: {
      async list(request = {}, signal) {
        const data = objectPageSchema.parse(
          await result(
            client
              .rpc(
                "crm_list_objects",
                {
                  p_search: request.search ?? "",
                  p_sort: request.sortBy ?? "createdAt",
                  p_direction: request.sortDirection ?? "desc",
                  p_page: request.pageIndex ?? 0,
                  p_page_size: request.pageSize ?? 10,
                },
                { get: true },
              )
              .abortSignal(signal ?? AbortSignal.timeout(30000)),
          ),
        );
        return {
          ...data,
          items: data.items.map((r) => ({
            ...objectDto(r),
            taskCount: r.task_count,
            acceptedCount: r.accepted_count,
            reviewCount: r.review_count,
          })),
        };
      },
      async options(signal) {
        return objectOptionsSchema.parse(
          await result(
            client
              .rpc("crm_list_options", { p_kind: "objects" }, { get: true })
              .abortSignal(signal ?? AbortSignal.timeout(30000)),
          ),
        );
      },
      async get(id) {
        return objectDto(
          await result(
            client.from("objects").select("*").eq("id", id).single(),
          ),
        );
      },
      async save(input, id, version) {
        const fields = {
          p_name: input.name.trim(),
          p_address: input.address.trim(),
        };
        return objectDto(
          await result(
            id
              ? client
                  .rpc("crm_update_object", {
                    ...fields,
                    p_id: id,
                    p_expected_version: expected(version),
                  })
                  .single()
              : client.rpc("crm_create_object", fields).single(),
          ),
        );
      },
      async remove(id, version) {
        const { error } = await client.rpc("crm_delete_object", {
          p_id: id,
          p_expected_version: expected(version),
        });
        if (error) throw apiError(error);
      },
    },
    tasks: {
      async list(request = {}, signal) {
        const data = taskPageSchema.parse(
          await result(
            client
              .rpc(
                "crm_list_tasks",
                {
                  p_search: request.search ?? "",
                  p_object_id: request.objectId,
                  p_status: request.status,
                  p_assignee_id: request.assigneeId,
                  p_sort: request.sortBy ?? "createdAt",
                  p_direction: request.sortDirection ?? "desc",
                  p_page: request.pageIndex ?? 0,
                  p_page_size: request.pageSize ?? 10,
                },
                { get: true },
              )
              .abortSignal(signal ?? AbortSignal.timeout(30000)),
          ),
        );
        return {
          ...data,
          items: data.items.map((r) => ({
            ...taskDto(r),
            objectName: r.object_name,
            assigneeName: r.assignee_name,
          })),
        };
      },
      async get(id) {
        return taskDto(
          await result(client.from("tasks").select("*").eq("id", id).single()),
        );
      },
      async history(id, request = {}, signal) {
        const data = historyPageSchema.parse(
          await result(
            client
              .rpc(
                "crm_task_history_page",
                {
                  p_task_id: id,
                  p_page: request.pageIndex ?? 0,
                  p_page_size: request.pageSize ?? 10,
                },
                { get: true },
              )
              .abortSignal(signal ?? AbortSignal.timeout(30000)),
          ),
        );
        return { ...data, items: data.items.map(historyDto) };
      },
      async save(input, id, version) {
        const fields = {
          p_title: input.title.trim(),
          p_description: input.description.trim(),
          p_object_id: input.objectId,
          p_assignee_id: input.assigneeId,
        };
        return taskDto(
          await result(
            id
              ? client
                  .rpc("crm_update_task", {
                    ...fields,
                    p_id: id,
                    p_expected_version: expected(version),
                  })
                  .single()
              : client.rpc("crm_create_task", fields).single(),
          ),
        );
      },
      async remove(id, version) {
        const { error } = await client.rpc("crm_delete_task", {
          p_id: id,
          p_expected_version: expected(version),
        });
        if (error) throw apiError(error);
      },
      async transition(id, status, comment, version) {
        return taskDto(
          await result(
            client
              .rpc("crm_transition_task", {
                p_id: id,
                p_to_status: status,
                p_comment: comment?.trim() || undefined,
                p_expected_version: expected(version),
              })
              .single(),
          ),
        );
      },
    },
  };
}
