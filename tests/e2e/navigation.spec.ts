import { test, expect, type Page } from "@playwright/test";

async function openObject(page: Page, user = "manager") {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(user + "@demo.ru");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.DEMO_USERS_PASSWORD!);
  await page.getByRole("button", { name: "Войти в пространство" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
  await page.goto("/objects");
  await page
    .getByRole("heading", { name: "ЖК «Сосновый»", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Задачи объекта" }),
  ).toBeVisible();
}

for (const user of ["manager", "ivan"]) {
  test(`${user}: object task links open details and return to the object`, async ({
    page,
  }) => {
    await openObject(page, user);
    if (user === "manager")
      await page
        .getByRole("button", {
          name: "Исполнитель: сортировать по возрастанию",
          exact: true,
        })
        .click();
    const title = "Установить окна в подъезде № 1";
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+$/);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /История изменений/ }),
    ).toBeVisible();
    await page.locator("a.back-link").click();
    await page
      .getByRole("link", {
        name: "Открыть: Смонтировать электропроводку на первом этаже",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Смонтировать электропроводку на первом этаже",
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("production recovers once when a task chunk cannot be loaded", async ({
  page,
}) => {
  test.skip(
    !process.env.CRM_BASE_URL,
    "Run against a production build or deployed site.",
  );
  await openObject(page);
  let blocked = 0;
  let reloads = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      reloads++;
  });
  await page.route("**/assets/*.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (
      blocked === 0 &&
      source.includes("Описание задачи") &&
      source.includes("История изменений")
    ) {
      blocked++;
      await route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "Simulated missing chunk",
      });
    } else await route.fulfill({ response });
  });
  const title = "Установить окна в подъезде № 1";
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  expect(blocked).toBe(1);
  expect(reloads).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Не удалось открыть страницу" }),
  ).toHaveCount(0);
});
