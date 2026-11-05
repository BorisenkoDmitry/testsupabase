import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
const password = process.env.DEMO_USERS_PASSWORD!;
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
}
async function action(page: Page, label: string, comment?: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (comment) await dialog.getByRole("textbox").fill(comment);
  await dialog.getByRole("button", { name: label, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
test("full browser revision cycle and stale edit cannot overwrite a newer task", async ({
  browser,
}) => {
  const api = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const auth = await api.auth.signInWithPassword({
    email: "manager@demo.ru",
    password,
  });
  expect(auth.error).toBeNull();
  const { data: users } = await api.from("profiles").select("id,email");
  const executor = users!.find((u) => u.email === "ivan@demo.ru")!;
  const { data: obj, error: oe } = await api
    .rpc("crm_create_object", {
      p_name: "E2E полный цикл",
      p_address: "Москва, тестирование рабочего цикла",
    })
    .single();
  expect(oe).toBeNull();
  const { data: task, error: te } = await api
    .rpc("crm_create_task", {
      p_title: "E2E полный цикл задачи",
      p_description: "Тест истории и версий",
      p_object_id: obj.id,
      p_assignee_id: executor.id,
    })
    .single();
  expect(te).toBeNull();
  const options = {
    baseURL: process.env.CRM_BASE_URL ?? "http://127.0.0.1:5180",
  };
  const managerContext = await browser.newContext(options),
    executorContext = await browser.newContext(options);
  const manager = await managerContext.newPage(),
    worker = await executorContext.newPage();
  try {
    await login(manager, "manager@demo.ru");
    await login(worker, "ivan@demo.ru");
    await worker.goto(`/tasks/${task.id}`);
    await action(worker, "Взять в работу");
    await action(worker, "Отправить на проверку", "Монтаж завершён");
    await manager.goto(`/tasks/${task.id}`);
    await manager
      .getByRole("button", { name: "На доработку", exact: true })
      .click();
    await manager
      .getByRole("dialog")
      .getByRole("button", { name: "На доработку", exact: true })
      .click();
    await expect(
      manager.getByText("Опишите, что нужно исправить."),
    ).toBeVisible();
    await manager
      .getByRole("dialog")
      .getByRole("textbox")
      .fill("Исправить шов");
    await manager
      .getByRole("dialog")
      .getByRole("button", { name: "На доработку", exact: true })
      .click();
    await expect(manager.getByRole("dialog")).toHaveCount(0);
    await worker.reload();
    await action(worker, "Взять в работу");
    await action(worker, "Отправить на проверку", "Шов исправлен");
    await manager.reload();
    await action(manager, "Принять задачу");
    await expect(
      manager.getByRole("heading", { name: /История изменений 7/ }),
    ).toBeVisible();
    await worker.reload();
    await expect(
      worker.getByRole("button", { name: "Взять в работу", exact: true }),
    ).toHaveCount(0);
    await manager
      .getByRole("button", { name: "Редактировать", exact: true })
      .click();
    await manager
      .getByLabel("Название задачи")
      .fill("Старая форма не должна сохраниться");
    const { data: current } = await api
      .from("tasks")
      .select("*")
      .eq("id", task.id)
      .single();
    const updated = await api.rpc("crm_update_task", {
      p_id: task.id,
      p_expected_version: current.version,
      p_title: "Обновлено в другом окне",
      p_description: current.description,
      p_object_id: obj.id,
      p_assignee_id: executor.id,
    });
    expect(updated.error).toBeNull();
    await manager
      .getByRole("dialog")
      .getByRole("button", { name: "Сохранить изменения", exact: true })
      .click();
    await expect(
      manager.getByText(/Запись уже изменена другим пользователем/),
    ).toBeVisible();
    await expect(
      manager.getByRole("heading", {
        name: "Обновлено в другом окне",
        exact: true,
      }),
    ).toBeVisible();
    const { data: after } = await api
      .from("tasks")
      .select("title")
      .eq("id", task.id)
      .single();
    expect(after.title).toBe("Обновлено в другом окне");
  } finally {
    const { data: current } = await api
      .from("tasks")
      .select("version")
      .eq("id", task.id)
      .maybeSingle();
    if (current)
      await api.rpc("crm_delete_task", {
        p_id: task.id,
        p_expected_version: current.version,
      });
    await api.rpc("crm_delete_object", {
      p_id: obj.id,
      p_expected_version: obj.version,
    });
    await api.auth.signOut({ scope: "local" });
    await managerContext.close();
    await executorContext.close();
  }
});
