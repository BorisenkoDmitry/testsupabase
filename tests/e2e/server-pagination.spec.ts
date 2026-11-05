import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const password = process.env.DEMO_USERS_PASSWORD!;
const baseURL = process.env.CRM_BASE_URL ?? "http://127.0.0.1:5180";
async function login(page: Page, name = "manager") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(name + "@demo.ru");
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
}
async function api() {
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email: "manager@demo.ru",
    password,
  });
  if (error) throw error;
  return client;
}
async function call(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}
async function cleanup(client: SupabaseClient, id: string) {
  const { data: tasks, error } = await client
    .from("tasks")
    .select("id,version")
    .eq("object_id", id);
  if (error) throw error;
  for (const t of tasks ?? [])
    await call(client, "crm_delete_task", {
      p_id: t.id,
      p_expected_version: t.version,
    });
  const { data: o } = await client
    .from("objects")
    .select("version")
    .eq("id", id)
    .maybeSingle();
  if (o)
    await call(client, "crm_delete_object", {
      p_id: id,
      p_expected_version: o.version,
    });
}
const taskResponse = (
  page: Page,
  match: (p: Record<string, unknown>) => boolean,
) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/rpc/crm_list_tasks") &&
      r.request().method() === "POST" &&
      match(r.request().postDataJSON()),
  );
const objectResponse = (
  page: Page,
  match: (p: Record<string, unknown>) => boolean,
) =>
  page.waitForResponse(
    (r) =>
      r.url().includes("/rpc/crm_list_objects") &&
      r.request().method() === "POST" &&
      match(r.request().postDataJSON()),
  );
test("server filters/sorts before pagination; controls appear only for more than one page", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await login(page);
  await page.goto("/tasks");
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(
    page.getByRole("navigation", { name: "Пагинация задач" }),
  ).toHaveCount(0);
  const client = await api();
  let id = "";
  try {
    const people = await call(client, "crm_list_options", {
      p_kind: "assignees",
    });
    const ivan = people.find(
      (u: { email: string }) => u.email === "ivan@demo.ru",
    );
    const alexey = people.find(
      (u: { email: string }) => u.email === "alexey@demo.ru",
    );
    const name = "E2E серверная пагинация " + Date.now();
    const obj = await call(client, "crm_create_object", {
      p_name: name,
      p_address: "Москва, серверная пагинация",
    });
    id = obj.id;
    const tasks = [];
    for (let i = 1; i <= 12; i++)
      tasks.push(
        await call(client, "crm_create_task", {
          p_title: "Серверная задача " + String(i).padStart(2, "0"),
          p_description: "Проверка SQL LIMIT/OFFSET",
          p_object_id: id,
          p_assignee_id: i <= 6 ? ivan.id : alexey.id,
        }),
      );
    const workerApi = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    await workerApi.auth.signInWithPassword({
      email: "ivan@demo.ru",
      password,
    });
    for (let i = 0; i < 2; i++) {
      let t = await call(workerApi, "crm_transition_task", {
        p_id: tasks[i].id,
        p_expected_version: 1,
        p_to_status: "in_progress",
      });
      t = await call(workerApi, "crm_transition_task", {
        p_id: t.id,
        p_expected_version: t.version,
        p_to_status: "review",
      });
      await call(client, "crm_transition_task", {
        p_id: t.id,
        p_expected_version: t.version,
        p_to_status: "accepted",
      });
    }
    await workerApi.auth.signOut({ scope: "local" });
    const firstResponse = taskResponse(
      page,
      (p) => p.p_object_id === id && p.p_page === 0,
    );
    await page.goto("/objects/" + id);
    const first = await (await firstResponse).json();
    expect(first.total).toBe(12);
    expect(first.items).toHaveLength(10);
    await expect(page.locator("tbody tr")).toHaveCount(10);
    const nav = page.getByRole("navigation", { name: "Пагинация задач" });
    await expect(nav).toContainText("Страница 1 из 2");
    await page.screenshot({
      path: "output/qa/desktop-pagination.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      nav.getByRole("button", { name: "Следующая страница" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "output/qa/mobile-pagination.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    const secondResponse = taskResponse(
      page,
      (p) => p.p_object_id === id && p.p_page === 1,
    );
    await nav.getByRole("button", { name: "Следующая страница" }).click();
    const second = await (await secondResponse).json();
    expect(second.items).toHaveLength(2);
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(nav).toContainText("Страница 2 из 2");
    expect(
      new Set(
        [...first.items, ...second.items].map((t: { id: string }) => t.id),
      ).size,
    ).toBe(12);
    const sortedResponse = taskResponse(
      page,
      (p) => p.p_sort === "title" && p.p_direction === "asc" && p.p_page === 0,
    );
    await page
      .getByRole("button", {
        name: "Задача: сортировать по возрастанию",
        exact: true,
      })
      .click();
    const sorted = await (await sortedResponse).json();
    await expect(page.locator("tbody .task-title-link").first()).toHaveText(
      sorted.items[0].title,
    );
    expect(sorted.items[0].title).toBe("Серверная задача 01");
    expect(sorted.items.at(-1).title).toBe("Серверная задача 10");
    const biggerResponse = taskResponse(
      page,
      (p) => p.p_page_size === 20 && p.p_page === 0,
    );
    await nav
      .getByRole("combobox", { name: "Записей на странице" })
      .selectOption("20");
    expect((await (await biggerResponse).json()).items).toHaveLength(12);
    await expect(page.locator("tbody tr")).toHaveCount(12);
    await expect(nav).toHaveCount(0);
    await page.goto("/tasks");
    await page.reload();
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await page.getByRole("combobox", { name: "Фильтр по объекту" }).click();
    const filteredResponse = taskResponse(page, (p) => p.p_object_id === id);
    await page.getByRole("option", { name, exact: true }).click();
    expect((await (await filteredResponse).json()).total).toBe(12);
    await page.getByRole("combobox", { name: "Фильтр по статусу" }).click();
    const newResponse = taskResponse(
      page,
      (p) => p.p_object_id === id && p.p_status === "new",
    );
    await page.getByRole("option", { name: "Новая", exact: true }).click();
    expect((await (await newResponse).json()).total).toBe(10);
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await expect(nav).toHaveCount(0);
    await page.getByRole("combobox", { name: "Фильтр по исполнителю" }).click();
    const assigneeResponse = taskResponse(
      page,
      (p) =>
        p.p_assignee_id === ivan.id &&
        p.p_status === "new" &&
        p.p_object_id === id,
    );
    await page
      .getByRole("option", { name: "Иван Петров", exact: true })
      .click();
    expect((await (await assigneeResponse).json()).total).toBe(4);
    await expect(page.locator("tbody tr")).toHaveCount(4);
    const searchResponse = taskResponse(
      page,
      (p) =>
        p.p_search === "03" &&
        p.p_assignee_id === ivan.id &&
        p.p_status === "new" &&
        p.p_object_id === id,
    );
    await page.getByRole("textbox", { name: "Поиск задач" }).fill("03");
    const found = await (await searchResponse).json();
    expect(found.total).toBe(1);
    expect(found.items[0].title).toBe("Серверная задача 03");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    const context = await browser.newContext({ baseURL });
    const executor = await context.newPage();
    try {
      await login(executor, "ivan");
      await expect(executor.locator("tbody tr")).toHaveCount(10);
      await expect(
        executor.getByRole("navigation", { name: "Пагинация задач" }),
      ).toHaveCount(0);
      const ownResponse = taskResponse(executor, (p) => p.p_object_id === id);
      await executor.goto("/objects/" + id);
      const own = await (await ownResponse).json();
      expect(own.total).toBe(6);
      expect(
        own.items.every(
          (t: { assignee_id: string }) => t.assignee_id === ivan.id,
        ),
      ).toBe(true);
      await expect(executor.locator("tbody tr")).toHaveCount(6);
    } finally {
      await context.close();
    }
  } finally {
    if (id) await cleanup(client, id);
    await client.auth.signOut({ scope: "local" });
  }
});
test("object search and page boundaries are supplied by Supabase", async ({
  page,
}) => {
  test.setTimeout(120000);
  const client = await api();
  const ids: string[] = [];
  const prefix = "E2E объекты " + Date.now();
  try {
    for (let i = 0; i < 11; i++) {
      const o = await call(client, "crm_create_object", {
        p_name: prefix + " " + String(i).padStart(2, "0"),
        p_address: "Москва, проверка страниц объектов",
      });
      ids.push(o.id);
    }
    const firstResponse = objectResponse(
      page,
      (p) => p.p_page === 0 && p.p_search === "",
    );
    await login(page);
    const first = await (await firstResponse).json();
    expect(first.total).toBe(14);
    expect(first.items).toHaveLength(10);
    const nav = page.getByRole("navigation", { name: "Пагинация объектов" });
    await expect(nav).toContainText("Страница 1 из 2");
    const filteredResponse = objectResponse(
      page,
      (p) => p.p_search === prefix && p.p_page === 0,
    );
    await page.getByRole("textbox", { name: "Поиск объектов" }).fill(prefix);
    expect((await (await filteredResponse).json()).total).toBe(11);
    const nextResponse = objectResponse(
      page,
      (p) => p.p_search === prefix && p.p_page === 1,
    );
    await nav.getByRole("button", { name: "Следующая страница" }).click();
    expect((await (await nextResponse).json()).items).toHaveLength(1);
    await expect(page.locator(".object-card")).toHaveCount(1);
    const lastResponse = objectResponse(
      page,
      (p) => p.p_search === prefix + " 10" && p.p_page === 0,
    );
    await page
      .getByRole("textbox", { name: "Поиск объектов" })
      .fill(prefix + " 10");
    expect((await (await lastResponse).json()).total).toBe(1);
    await expect(nav).toHaveCount(0);
  } finally {
    for (const id of ids) await cleanup(client, id);
    await client.auth.signOut({ scope: "local" });
  }
});
test("long task history is ordered and paged by server", async ({ page }) => {
  test.setTimeout(120000);
  const client = await api();
  let objectId = "";
  const worker = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  try {
    const people = await call(client, "crm_list_options", {
      p_kind: "assignees",
    });
    const ivan = people.find(
      (u: { email: string }) => u.email === "ivan@demo.ru",
    );
    const object = await call(client, "crm_create_object", {
      p_name: "E2E история " + Date.now(),
      p_address: "Москва, проверка истории",
    });
    objectId = object.id;
    let task = await call(client, "crm_create_task", {
      p_title: "E2E длинная история",
      p_description: "Проверка страниц аудита",
      p_object_id: objectId,
      p_assignee_id: ivan.id,
    });
    await worker.auth.signInWithPassword({ email: "ivan@demo.ru", password });
    const transition = async (
      actor: SupabaseClient,
      status: string,
      comment?: string,
    ) => {
      task = await call(actor, "crm_transition_task", {
        p_id: task.id,
        p_expected_version: task.version,
        p_to_status: status,
        p_comment: comment,
      });
    };
    for (let i = 0; i < 4; i++) {
      await transition(worker, "in_progress");
      await transition(worker, "review");
      await transition(client, "revision", "Уточнение " + i);
    }
    await transition(worker, "in_progress");
    await transition(worker, "review");
    await transition(client, "accepted");
    await login(page);
    const firstResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/crm_task_history_page") &&
        r.request().postDataJSON()?.p_task_id === task.id,
    );
    await page.goto("/tasks/" + task.id);
    const first = await (await firstResponse).json();
    expect(first.total).toBe(16);
    expect(first.items).toHaveLength(10);
    await expect(page.locator(".timeline > li")).toHaveCount(10);
    const nav = page.getByRole("navigation", { name: "Пагинация истории" });
    await expect(nav).toContainText("Страница 1 из 2");
    const nextResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/crm_task_history_page") &&
        r.request().postDataJSON()?.p_page === 1,
    );
    await nav.getByRole("button", { name: "Следующая страница" }).click();
    const second = await (await nextResponse).json();
    expect(second.items).toHaveLength(6);
    await expect(page.locator(".timeline > li")).toHaveCount(6);
    expect(
      new Set(
        [...first.items, ...second.items].map((h: { id: string }) => h.id),
      ).size,
    ).toBe(16);
    expect(
      await page.locator(".timeline time").first().getAttribute("datetime"),
    ).toBe(second.items[0].created_at);
  } finally {
    if (objectId) await cleanup(client, objectId);
    await worker.auth.signOut({ scope: "local" });
    await client.auth.signOut({ scope: "local" });
  }
});
