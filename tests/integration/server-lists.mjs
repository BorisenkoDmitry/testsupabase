import assert from "node:assert/strict";
export async function verifyCloudLists({
  manager,
  ivan,
  alexey,
  anon,
  all,
  ok,
  denied,
  data,
}) {
  const tasks = (actor, args = {}) =>
    data(actor.client.rpc("crm_list_tasks", args));
  for (const [actor, total] of [
    [manager, 8],
    [ivan, 4],
    [alexey, 4],
  ]) {
    const first = await tasks(actor, { p_page_size: 2 });
    ok(
      first.items.length === 2 && first.total === total,
      "Server pages and totals respect RLS",
    );
    if (actor !== manager)
      ok(
        first.items.every((t) => t.assignee_id === actor.id),
        "Page contains assigned tasks only",
      );
    const allIds = [];
    for (let p_page = 0; p_page < total / 2; p_page++)
      allIds.push(
        ...(await tasks(actor, { p_page, p_page_size: 2 })).items.map(
          (t) => t.id,
        ),
      );
    ok(
      new Set(allIds).size === total,
      "Stable pages contain no missing or duplicate tasks",
    );
    const beyond = await tasks(actor, { p_page: 999999, p_page_size: 2 });
    ok(
      beyond.pageIndex === total / 2 - 1,
      "Server handles requests beyond last page",
    );
  }
  const target = all.find((t) => t.title === "Установить окна в подъезде № 1");
  assert(target);
  const combined = await tasks(manager, {
    p_search: "УСТАНОВИТЬ",
    p_object_id: target.object_id,
    p_status: "new",
    p_assignee_id: ivan.id,
    p_page_size: 1,
  });
  ok(
    combined.total === 1 && combined.items[0].id === target.id,
    "All filters and case-insensitive search combine in SQL",
  );
  const empty = await tasks(manager, { p_search: "%", p_page: 25 });
  ok(
    empty.total === 0 && empty.items.length === 0 && empty.pageIndex === 0,
    "Search is literal and empty pages are normalized",
  );
  for (const p_sort of ["title", "status", "assigneeName", "createdAt"])
    for (const p_direction of ["asc", "desc"]) {
      const full = await tasks(manager, {
        p_sort,
        p_direction,
        p_page_size: 100,
      });
      const page = await tasks(manager, {
        p_sort,
        p_direction,
        p_page: 1,
        p_page_size: 2,
      });
      ok(
        page.items.map((t) => t.id).join(",") ===
          full.items
            .slice(2, 4)
            .map((t) => t.id)
            .join(","),
        "Every sort order is global before LIMIT/OFFSET",
      );
    }
  const title = await tasks(manager, {
    p_sort: "title",
    p_direction: "asc",
    p_page_size: 100,
  });
  const expected = [...all].sort((a, b) =>
    new Intl.Collator("ru", { numeric: true, sensitivity: "base" }).compare(
      a.title,
      b.title,
    ),
  );
  ok(
    title.items.map((t) => t.id).join(",") ===
      expected.map((t) => t.id).join(","),
    "SQL title order matches Russian display names",
  );
  const persons = await tasks(manager, {
    p_sort: "assigneeName",
    p_direction: "asc",
    p_page_size: 100,
  });
  ok(
    persons.items.slice(0, 4).every((t) => t.assignee_id === alexey.id),
    "Server sorts assignees by names, not IDs",
  );
  const states = await tasks(manager, {
    p_sort: "status",
    p_direction: "asc",
    p_page_size: 100,
  });
  ok(
    states.items.map((t) => t.status).join(",") ===
      "new,new,in_progress,in_progress,review,revision,accepted,accepted",
    "Server status order follows workflow",
  );
  ok(
    (await tasks(ivan, { p_assignee_id: alexey.id })).total === 0,
    "Forged filters cannot disclose foreign row counts",
  );
  for (const [actor, active] of [
    [manager, 6],
    [ivan, 4],
    [alexey, 2],
  ]) {
    const objects = await data(
      actor.client.rpc("crm_list_objects", { p_page_size: 1 }),
    );
    ok(
      objects.total === 3 && objects.items.length === 1,
      "Objects use SQL page boundaries",
    );
    ok(
      objects.summary.activeTaskCount === active,
      "Overview aggregate is protected by RLS",
    );
    const ownTasks = await data(
      actor.client
        .from("tasks")
        .select("id")
        .eq("object_id", objects.items[0].id),
    );
    ok(
      objects.items[0].task_count === ownTasks.length,
      "Object card count includes only permitted tasks",
    );
    const found = await data(
      actor.client.rpc("crm_list_objects", { p_search: "Репино" }),
    );
    ok(
      found.total === 1 && found.items[0].name === "Дом в Репино",
      "Object search is performed on server",
    );
  }
  const options = await data(
    manager.client.rpc("crm_list_options", { p_kind: "assignees" }),
  );
  ok(
    options.length === 2 &&
      options.every((u) => u.role === "executor" && u.is_active),
    "Dropdown eligibility is determined by server",
  );
  const foreignTask = all.find((t) => t.assignee_id === alexey.id);
  const history = await data(
    manager.client.rpc("crm_task_history_page", {
      p_task_id: foreignTask.id,
      p_page_size: 2,
    }),
  );
  ok(
    history.items.length <= 2 && history.total >= history.items.length,
    "History RPC limits rows and reports total",
  );
  ok(
    history.items.every(
      (h, i) => i === 0 || history.items[i - 1].created_at >= h.created_at,
    ),
    "History is ordered by database",
  );
  const hidden = await data(
    ivan.client.rpc("crm_task_history_page", { p_task_id: foreignTask.id }),
  );
  ok(
    hidden.items.length === 0 && hidden.total === 0,
    "History pagination preserves foreign access restrictions",
  );
  for (const args of [
    { p_sort: "title;drop table public.tasks" },
    { p_page: -1 },
    { p_page_size: 101 },
    { p_direction: "INVALID" },
  ])
    await denied(
      manager.client.rpc("crm_list_tasks", args),
      "Invalid list parameters are rejected",
      "22023",
    );
  await denied(
    anon.rpc("crm_list_tasks", {}),
    "Anonymous cannot invoke task list RPC",
  );
  await denied(
    anon.rpc("crm_list_objects", {}),
    "Anonymous cannot invoke object list RPC",
  );
  await denied(
    anon.rpc("crm_list_options", { p_kind: "profiles" }),
    "Anonymous cannot read dropdown profiles",
  );
  await denied(
    anon.rpc("crm_task_history_page", { p_task_id: foreignTask.id }),
    "Anonymous cannot invoke history page RPC",
  );
}
