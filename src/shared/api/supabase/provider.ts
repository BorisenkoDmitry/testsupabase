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

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
const objectDto = (r: Row<"objects">): ConstructionObject => ({
  id: r.id,
  name: r.name,
  address: r.address,
  createdAt: r.created_at,
  version: r.version,
});
const taskDto = (r: Row<"tasks">): Task => ({
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
const userDto = (r: Row<"profiles">): User => ({
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

// Read every page: PostgREST limits each response even when .select() has no limit.
async function pages<T>(
  load: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string; code?: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw apiError(error);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
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
      async list() {
        return (
          await pages((from, to) =>
            client.from("profiles").select("*").order("id").range(from, to),
          )
        ).map(userDto);
      },
    },
    objects: {
      async list() {
        return (
          await pages((from, to) =>
            client
              .from("objects")
              .select("*")
              .order("created_at", { ascending: false })
              .order("id")
              .range(from, to),
          )
        ).map(objectDto);
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
      async list() {
        return (
          await pages((from, to) =>
            client
              .from("tasks")
              .select("*")
              .order("created_at", { ascending: false })
              .order("id")
              .range(from, to),
          )
        ).map(taskDto);
      },
      async get(id) {
        return taskDto(
          await result(client.from("tasks").select("*").eq("id", id).single()),
        );
      },
      async history(id) {
        return (
          await pages((from, to) =>
            client
              .from("task_history")
              .select("*")
              .eq("task_id", id)
              .order("created_at")
              .order("id")
              .range(from, to),
          )
        ).map(historyDto);
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
