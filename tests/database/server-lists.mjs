import assert from "node:assert/strict";
export async function verifyServerLists({
  rows,
  actor,
  actorIds,
  ids,
  check,
  denied,
}) {
  const tasks = async (args = {}) =>
    (
      await rows(
        "select public.crm_list_tasks($1,$2,$3,$4,$5,$6,$7,$8) as page",
        [
          args.search ?? "",
          args.objectId ?? null,
          args.status ?? null,
          args.assigneeId ?? null,
          args.sort ?? "createdAt",
          args.direction ?? "desc",
          args.page ?? 0,
          args.pageSize ?? 2,
        ],
      )
    )[0].page;
  for (const [index, total] of [
    [0, 8],
    [1, 4],
    [2, 4],
  ]) {
    await actor(index);
    const first = await tasks();
    check(
      first.total === total && first.items.length === 2,
      "RPC returns only requested page and RLS-scoped total",
    );
    const idsSeen = [];
    for (let page = 0; page < total / 2; page++)
      idsSeen.push(...(await tasks({ page })).items.map((t) => t.id));
    check(
      new Set(idsSeen).size === total,
      "Adjacent pages have no duplicate or missing IDs",
    );
    const last = await tasks({ page: 999999 });
    check(last.pageIndex === total / 2 - 1, "Server clamps out-of-range pages");
    if (index)
      check(
        first.items.every((t) => t.assignee_id === actorIds[index]),
        "Page items do not leak foreign tasks",
      );
  }
  await actor(0);
  const combined = await tasks({
    search: "УСТАНОВИТЬ",
    objectId: ids["object-1"],
    status: "new",
    assigneeId: actorIds[1],
  });
  check(
    combined.total === 1 && combined.items[0].id === ids["task-3"],
    "Search/object/status/assignee are combined on server",
  );
  const empty = await tasks({ search: "%", page: 5 });
  check(
    empty.total === 0 && empty.items.length === 0 && empty.pageIndex === 0,
    "Search treats wildcard text literally and empty result has page zero",
  );
  const ascending = await tasks({
    sort: "title",
    direction: "asc",
    pageSize: 100,
  });
  const second = await tasks({
    sort: "title",
    direction: "asc",
    page: 1,
    pageSize: 2,
  });
  check(
    JSON.stringify(second.items.map((t) => t.id)) ===
      JSON.stringify(ascending.items.slice(2, 4).map((t) => t.id)),
    "Sorting occurs before pagination",
  );
  const descending = await tasks({
    sort: "title",
    direction: "desc",
    pageSize: 100,
  });
  check(
    JSON.stringify(ascending.items.map((t) => t.id)) ===
      JSON.stringify(descending.items.map((t) => t.id).reverse()),
    "Both sort directions are applied globally",
  );
  const byPerson = await tasks({
    sort: "assigneeName",
    direction: "asc",
    pageSize: 100,
  });
  check(
    byPerson.items.slice(0, 4).every((t) => t.assignee_id === actorIds[2]),
    "Assignees sorted by display name, not UUID",
  );
  const byStatus = await tasks({
    sort: "status",
    direction: "asc",
    pageSize: 100,
  });
  check(
    byStatus.items.map((t) => t.status).join(",") ===
      "new,new,in_progress,in_progress,review,revision,accepted,accepted",
    "Statuses use workflow order",
  );
  check(
    combined.summary.total === 3 && combined.summary.newCount === 1,
    "Object-scoped summary is computed independently of search filters",
  );
  await actor(1);
  check(
    (await tasks({ assigneeId: actorIds[2] })).total === 0,
    "Forged assignee filter does not bypass RLS or leak total",
  );
  for (const index of [0, 1, 2]) {
    await actor(index);
    const page = (
      await rows("select public.crm_list_objects($1,$2,$3,$4,$5) as page", [
        "",
        "name",
        "asc",
        0,
        1,
      ])
    )[0].page;
    check(
      page.items.length === 1 && page.total === 3,
      "Objects are paged on server",
    );
    check(
      page.summary.activeTaskCount === [6, 4, 2][index],
      "Object summary respects executor visibility",
    );
    const expected = (
      await rows(
        "select count(*)::int as n from public.tasks where object_id=$1",
        [page.items[0].id],
      )
    )[0].n;
    check(
      page.items[0].task_count === expected,
      "Object card counters respect row security",
    );
    const search = (
      await rows("select public.crm_list_objects($1) as page", ["Репино"])
    )[0].page;
    check(
      search.total === 1 && search.items[0].id === ids["object-3"],
      "Object name and address search is performed by database",
    );
  }
  await actor(0);
  const assignees = (
    await rows("select public.crm_list_options('assignees') as items")
  )[0].items;
  check(
    assignees.length === 2 &&
      assignees.every((p) => p.role === "executor" && p.is_active),
    "Eligible assignees are filtered by server",
  );
  const history = (
    await rows("select public.crm_task_history_page($1,0,2) as page", [
      ids["task-2"],
    ])
  )[0].page;
  check(
    history.total === 3 && history.items.length === 2,
    "History is paged before transmission",
  );
  check(
    history.items[0].created_at >= history.items[1].created_at,
    "History arrives newest first",
  );
  const tail = (
    await rows("select public.crm_task_history_page($1,1,2) as page", [
      ids["task-2"],
    ])
  )[0].page;
  check(
    tail.items.length === 1 && tail.items[0].id !== history.items[0].id,
    "Second history page is disjoint",
  );
  await actor(1);
  const foreignHistory = (
    await rows("select public.crm_task_history_page($1) as page", [
      ids["task-2"],
    ])
  )[0].page;
  check(
    foreignHistory.total === 0 && foreignHistory.items.length === 0,
    "History total does not leak foreign events",
  );
  await denied("select public.crm_list_options('secret')", [], "22023");
  await denied(
    "select public.crm_list_tasks(p_sort=>'title; drop table public.tasks')",
    [],
    "22023",
  );
  await denied(
    "select public.crm_list_tasks(p_direction=>'sideways')",
    [],
    "22023",
  );
  await denied("select public.crm_list_tasks(p_page=>-1)", [], "22023");
  await denied("select public.crm_list_tasks(p_page_size=>101)", [], "22023");
  await denied("select public.crm_list_objects(p_page_size=>0)", [], "22023");
  await rows("reset role");
  await rows("set role anon");
  await denied("select public.crm_list_tasks()", [], "42501");
  await denied("select public.crm_list_objects()", [], "42501");
  await denied("select public.crm_list_options('profiles')", [], "42501");
  await denied(
    "select public.crm_task_history_page($1)",
    [ids["task-2"]],
    "42501",
  );
  await actor(0);
  assert(
    ascending.items.every(
      (t) =>
        typeof t.object_name === "string" &&
        typeof t.assignee_name === "string",
    ),
  );
}
