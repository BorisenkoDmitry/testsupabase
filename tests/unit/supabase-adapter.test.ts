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
  it("reads subsequent pages rather than truncating at the API limit", async () => {
    const { api, fetcher, requests } = setup();
    fetcher.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify(
            Array.from({ length: 500 }, (_, i) => ({ ...task, id: String(i) })),
          ),
          { headers: { "content-type": "application/json" } },
        ),
    );
    fetcher.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify([{ ...task, id: "last" }]), {
          headers: { "content-type": "application/json" },
        }),
    );
    expect(await api.tasks.list()).toHaveLength(501);
    // The two calls go to a read endpoint; no mutation is needed for pagination.
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(requests).toHaveLength(0);
  });
});
