import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
const password = process.env.DEMO_USERS_PASSWORD;
if (!password)
  throw Error("Run npm run test:e2e with .env.supabase configured.");
const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
async function login(page: Page, name: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${name}@demo.ru`);
  await page.getByLabel("Пароль", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(page).toHaveURL(
    name === "manager" ? /\/objects$/ : /\/my-tasks$/,
    { timeout: 15_000 },
  );
}
async function cleanupObject(id: string) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.auth.signInWithPassword({
    email: "manager@demo.ru",
    password: password!,
  });
  const { data: tasks } = await client
    .from("tasks")
    .select("id,version")
    .eq("object_id", id);
  for (const task of tasks ?? [])
    await client.rpc("crm_delete_task", {
      p_id: task.id,
      p_expected_version: task.version,
    });
  const { data: object } = await client
    .from("objects")
    .select("version")
    .eq("id", id)
    .maybeSingle();
  if (object)
    await client.rpc("crm_delete_object", {
      p_id: id,
      p_expected_version: object.version,
    });
  await client.auth.signOut({ scope: "local" });
}
test("login validation, wrong password, and no public registration UI", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByText("Попробуйте разные роли")).toHaveCount(0);
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(page.getByText("Введите корректный email.")).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("manager@demo.ru");
  await page.getByLabel("Пароль", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Неверный email или пароль.",
  );
});
test("manager sees tasks, filters them, keeps session after reload, and logs out", async ({
  page,
}) => {
  await login(page, "manager");
  await expect(
    page.getByRole("heading", { name: "Объекты", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Все задачи", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.getByText("Демо-режим", { exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Поиск задач" }).fill("окна");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Все задачи", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/login$/);
});
for (const name of ["ivan", "alexey"]) {
  test(`${name}: only assigned tasks, forbidden manager actions hidden`, async ({
    page,
  }) => {
    await login(page, name);
    await expect(page.locator("tbody tr")).toHaveCount(4);
    await expect(
      page.getByRole("button", { name: "Новая задача", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "Фильтр по исполнителю" }),
    ).toHaveCount(0);
    await page.locator("tbody tr a").first().click();
    await expect(
      page.getByRole("heading", { name: /История изменений/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Редактировать", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Удалить", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Принять задачу", exact: true }),
    ).toHaveCount(0);
  });
}
test("manager creates and edits object/task, reassigns, and archives them through UI", async ({
  page,
}) => {
  await login(page, "manager");
  const objectName = `E2E стройка ${Date.now()}`;
  let objectId = "";
  try {
    await page
      .getByRole("button", { name: "Новый объект", exact: true })
      .click();
    await page.getByLabel("Название объекта").fill(objectName);
    await page
      .getByLabel("Адрес", { exact: true })
      .fill("Москва, Тестовая улица, 10");
    const objectResponse = page.waitForResponse((r) =>
      r.url().includes("/rpc/crm_create_object"),
    );
    await page
      .getByRole("button", { name: "Создать объект", exact: true })
      .click();
    objectId = (await (await objectResponse).json()).id;
    await page.getByRole("heading", { name: objectName, exact: true }).click();
    await page
      .getByRole("button", { name: "Новая задача", exact: true })
      .click();
    await page.getByLabel("Название задачи").fill("E2E проверить монтаж");
    await page
      .getByRole("combobox", { name: "Исполнитель", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Иван Петров", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Создать задачу", exact: true })
      .click();
    await page
      .getByRole("link", { name: "E2E проверить монтаж", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /История изменений 1/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Редактировать", exact: true })
      .click();
    await page
      .getByLabel("Название задачи")
      .fill("E2E проверить монтаж повторно");
    await page
      .getByRole("combobox", { name: "Исполнитель", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Алексей Смирнов", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Сохранить изменения", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "E2E проверить монтаж повторно",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Удалить", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "История сохранится",
    );
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Удалить", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: objectName, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Редактировать", exact: true })
      .click();
    await page
      .getByLabel("Адрес", { exact: true })
      .fill("Москва, Обновлённая улица, 12");
    await page
      .getByRole("button", { name: "Сохранить изменения", exact: true })
      .click();
    await expect(page.getByText("Москва, Обновлённая улица, 12")).toBeVisible();
    await page.getByRole("button", { name: "Удалить", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Удалить", exact: true })
      .click();
    await expect(page).toHaveURL(/\/objects$/);
  } finally {
    if (objectId) await cleanupObject(objectId);
  }
});
test("mobile layout and keyboard navigation stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "ivan");
  await expect(page.locator("tbody tr")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "output/qa/mobile-tasks.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "output/qa/desktop-tasks.png",
    fullPage: true,
  });
});
