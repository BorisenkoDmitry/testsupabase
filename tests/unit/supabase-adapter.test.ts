import { describe, it, expect, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseApi } from "@/shared/api/supabase/provider";
import { apiError, isConflict } from "@/shared/api/errors";
import type { Database } from "@/shared/api/supabase/database.types";

const task = {
  id: "task",
  title: "Задача",
  description: "Описание",
  object_id: "object",
  assignee_id: "ivan",
  author_id: "manager",
  status: "new",
  created_at: "2026-11-05T00:00:00Z",
  updated_at: "2026-11-05T00:00:00Z",
  version: 3,
  deleted_at: null,
};
function setup(response: unknown = task, status = 200) {
  const requests: {
    url: string;
    method?: string;
    body: Record<string, unknown> | null;
  }[] = [];
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(JSON.stringify(response), {
        status,
        headers: { "content-type": "application/json" },
      });
    },
  );
  const client = createClient<Database>(
    "https://example.supabase.co",
    "public-key",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetcher },
    },
  );
  return { api: createSupabaseApi(client), requests, fetcher };
}
function expectGet(
  request: ReturnType<typeof setup>["requests"][number],
  params: Record<string, string>,
) {
  expect(request.method).toBe("GET");
  expect(request.body).toBeNull();
  expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual(params);
}
describe("Supabase adapter boundary", () => {
  it("maps server fields and includes the version displayed to the user", async () => {
    const { api, requests } = setup();
    const result = await api.tasks.save(
      {
        title: "  Задача ",
        description: " Текст ",
        objectId: "object",
        assigneeId: "ivan",
      },
      "task",
      3,
    );
    expect(result).toMatchObject({
      id: "task",
      objectId: "object",
      assigneeId: "ivan",
      authorId: "manager",
      version: 3,
    });
    expect(requests[0].url).toContain("/rpc/crm_update_task");
    expect(requests[0].body).toEqual({
      p_id: "task",
      p_expected_version: 3,
      p_title: "Задача",
      p_description: "Текст",
      p_object_id: "object",
      p_assignee_id: "ivan",
    });
  });
  it("discards injected role/status/author/time fields", async () => {
    const { api, requests } = setup();
    const input = {
      title: "Задача",
      description: "",
      objectId: "object",
      assigneeId: "ivan",
      status: "accepted",
      authorId: "attacker",
      createdAt: "1990",
      role: "manager",
    };
    await api.tasks.save(input);
    expect(requests[0].url).toContain("crm_create_task");
    expect(Object.keys(requests[0].body!)).toEqual([
      "p_title",
      "p_description",
      "p_object_id",
      "p_assignee_id",
    ]);
  });
  it.each([undefined, 0, -1, NaN, 1.5])(
    "rejects invalid expectedVersion %s before sending a write",
    async (version) => {
      const { api, fetcher } = setup();
      await expect(
        api.tasks.transition("task", "review", "", version),
      ).rejects.toThrow("Неизвестна версия");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("uses RPC for deletion with exact version", async () => {
    const { api, requests } = setup(null);
    await api.tasks.remove("task", 3);
    expect(requests[0].url).toContain("crm_delete_task");
    expect(requests[0].body).toEqual({ p_id: "task", p_expected_version: 3 });
  });
  it("returns conflicts immediately without retrying writes", async () => {
    const { api, fetcher } = setup({ code: "PT409", message: "stale" }, 409);
    const error = await api.tasks
      .transition("task", "review", "Готово", 3)
      .catch((e) => e);
    expect(isConflict(error)).toBe(true);
    expect(error.message).toContain("откройте форму заново");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("maps authorization errors without exposing raw SQL details", () => {
    expect(
      apiError({ code: "42501", message: "private.secret_table details" })
        .message,
    ).toBe("У вас нет прав на это действие.");
    expect(
      apiError({ code: "invalid_credentials", message: "invalid" }).message,
    ).toBe("Неверный email или пароль.");
  });
  it("sends every list parameter to one server RPC and preserves the returned page", async () => {
    const response = {
      items: [{ ...task, object_name: "Объект", assignee_name: "Иван" }],
      total: 101,
      pageIndex: 2,
      pageSize: 20,
      summary: { total: 120, newCount: 8, inProgressCount: 9, reviewCount: 4 },
    };
    const { api, requests, fetcher } = setup(response);
    const signal = new AbortController().signal;
    const page = await api.tasks.list(
      {
        search: "Кириллица & + ? # = %_",
        objectId: "obj",
        assigneeId: "user",
        status: "new",
        sortBy: "assigneeName",
        sortDirection: "asc",
        pageIndex: 2,
        pageSize: 20,
      },
      signal,
    );
    expect(requests[0].url).toContain("/rpc/crm_list_tasks");
    expectGet(requests[0], {
      p_search: "Кириллица & + ? # = %_",
      p_object_id: "obj",
      p_assignee_id: "user",
      p_status: "new",
      p_sort: "assigneeName",
      p_direction: "asc",
      p_page: "2",
      p_page_size: "20",
    });
    expect(page.total).toBe(101);
    expect(page.pageIndex).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].assigneeName).toBe("Иван");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.signal).toBe(signal);
  });
  it("reads object card counts and summary directly from the server", async () => {
    const { api, requests } = setup({
      items: [
        {
          id: "obj",
          name: "Стройка",
          address: "Москва",
          created_at: "2026-11-05",
          version: 1,
          task_count: 30,
          accepted_count: 7,
          review_count: 4,
        },
      ],
      total: 14,
      pageIndex: 1,
      pageSize: 10,
      summary: { objectCount: 14, activeTaskCount: 90, reviewCount: 20 },
    });
    const page = await api.objects.list({ search: "Москва", pageIndex: 1 });
    expect(requests[0].url).toContain("crm_list_objects");
    expectGet(requests[0], {
      p_search: "Москва",
      p_sort: "createdAt",
      p_direction: "desc",
      p_page: "1",
      p_page_size: "10",
    });
    expect(page.items[0]).toMatchObject({
      taskCount: 30,
      acceptedCount: 7,
      reviewCount: 4,
    });
    expect(page.summary.activeTaskCount).toBe(90);
  });
  it("requests eligible assignees on the server", async () => {
    const { api, requests } = setup([
      {
        id: "ivan",
        full_name: "Иван",
        email: "ivan@example.test",
        role: "executor",
        is_active: true,
      },
    ]);
    expect(await api.users.list(true)).toHaveLength(1);
    expectGet(requests[0], { p_kind: "assignees" });
  });
  it("passes history page parameters and preserves server order", async () => {
    const item = {
      id: "h1",
      task_id: "task",
      actor_id: "ivan",
      from_status: "new",
      to_status: "in_progress",
      comment: null,
      created_at: "2026-11-01",
    };
    const { api, requests } = setup({
      items: [item, { ...item, id: "h2", created_at: "2026-11-02" }],
      total: 19,
      pageIndex: 1,
      pageSize: 10,
    });
    const page = await api.tasks.history("task", { pageIndex: 1 });
    expectGet(requests[0], {
      p_task_id: "task",
      p_page: "1",
      p_page_size: "10",
    });
    expect(page.items.map((x) => x.id)).toEqual(["h1", "h2"]);
    expect(page.total).toBe(19);
  });
  it("rejects malformed page responses without falling back to fetching all records", async () => {
    const { api, fetcher } = setup([task]);
    await expect(api.tasks.list()).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("omits unset filters from GET query parameters", async () => {
    const { api, requests } = setup({
      items: [],
      total: 0,
      pageIndex: 0,
      pageSize: 10,
      summary: { total: 0, newCount: 0, inProgressCount: 0, reviewCount: 0 },
    });
    await api.tasks.list();
    expectGet(requests[0], {
      p_search: "",
      p_sort: "createdAt",
      p_direction: "desc",
      p_page: "0",
      p_page_size: "10",
    });
  });
  it("uses GET for profile and object reference lists", async () => {
    const { api, requests } = setup([]);
    await api.users.list();
    await api.objects.options();
    expectGet(requests[0], { p_kind: "profiles" });
    expectGet(requests[1], { p_kind: "objects" });
  });
  it("uses GET for individual objects and tasks", async () => {
    const { api, requests } = setup({
      ...task,
      name: "Объект",
      address: "Москва",
    });
    await api.objects.get("object");
    await api.tasks.get("task");
    expectGet(requests[0], { select: "*", id: "eq.object" });
    expectGet(requests[1], { select: "*", id: "eq.task" });
  });
  it.each([
    "crm_create_object",
    "crm_update_object",
    "crm_delete_object",
    "crm_create_task",
    "crm_update_task",
    "crm_delete_task",
    "crm_transition_task",
  ])("keeps write RPC %s as POST with a JSON body", async (name) => {
    const { api, requests } = setup({
      ...task,
      name: "Объект",
      address: "Москва",
    });
    const object = { name: "Объект", address: "Москва" };
    const input = {
      title: "Задача",
      description: "",
      objectId: "object",
      assigneeId: "ivan",
    };
    switch (name) {
      case "crm_create_object":
        await api.objects.save(object);
        break;
      case "crm_update_object":
        await api.objects.save(object, "object", 3);
        break;
      case "crm_delete_object":
        await api.objects.remove("object", 3);
        break;
      case "crm_create_task":
        await api.tasks.save(input);
        break;
      case "crm_update_task":
        await api.tasks.save(input, "task", 3);
        break;
      case "crm_delete_task":
        await api.tasks.remove("task", 3);
        break;
      case "crm_transition_task":
        await api.tasks.transition("task", "review", "Готово", 3);
        break;
    }
    expect(new URL(requests[0].url).pathname).toBe("/rest/v1/rpc/" + name);
    expect(new URL(requests[0].url).search).toBe("");
    expect(requests[0].method).toBe("POST");
    expect(requests[0].body).not.toBeNull();
  });
});
