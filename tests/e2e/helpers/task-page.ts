import type { Page } from "@playwright/test";

export function taskPage(page: Page, search?: string) {
  return page
    .waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith("/rpc/crm_list_tasks") &&
        response.request().method() === "GET" &&
        response.status() === 200 &&
        (search === undefined || url.searchParams.get("p_search") === search)
      );
    })
    .then(
      (response) =>
        response.json() as Promise<{
          items: { id: string; title: string; assignee_id: string }[];
          total: number;
          pageSize: number;
        }>,
    );
}
