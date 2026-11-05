// PostgreSQL/WASM validation only. This does not connect to a real Supabase project.
// Install optional tool: npm install --prefix tmp/supabase-plan @electric-sql/pglite
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import { verifyServerLists } from "./server-lists.mjs";
const db = new PGlite();
const fixture = JSON.parse(readFileSync("supabase/fixtures/demo.json", "utf8"));
const ids = fixture.ids;
const actorIds = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];
const report = [];
let assertions = 0;
const check = (condition, message) => {
  assert(condition, message);
  assertions++;
};
const query = (sql, params = []) => db.query(sql, params);
const rows = async (sql, params = []) => (await query(sql, params)).rows;
async function actor(index) {
  await db.exec("reset role");
  await query("select set_config('request.jwt.claim.sub', $1, false)", [
    index == null ? "" : actorIds[index],
  ]);
  await db.exec("set role authenticated");
}
async function denied(sql, params = [], code) {
  try {
    await query(sql, params);
    throw new Error("Operation unexpectedly succeeded: " + sql);
  } catch (error) {
    if (error.message.startsWith("Operation unexpectedly")) throw error;
    if (code) assert.equal(error.code, code);
    assertions++;
  }
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text unique not null);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const [i, user] of fixture.users.entries())
    await query("insert into auth.users(id,email) values($1,$2)", [
      actorIds[i],
      user.email,
    ]);
  for (const file of readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(readFileSync("supabase/seeds/demo.sql", "utf8"));
  await db.exec(readFileSync("supabase/seeds/demo.sql", "utf8"));
  const counts = (
    await rows(
      `select (select count(*) from public.profiles)::int profiles, (select count(*) from public.objects)::int objects, (select count(*) from public.tasks)::int tasks, (select count(*) from public.task_history)::int history`,
    )
  )[0];
  assert.deepEqual(counts, { profiles: 3, objects: 3, tasks: 8, history: 21 });
  assertions++;
  await verifyServerLists({ rows, actor, actorIds, ids, check, denied });
  report.push(
    "Schema and RPC migrations execute; seed executes twice without duplicates: 3 profiles, 3 objects, 8 tasks, 21 events.",
  );
  for (const [i, expected] of [
    [0, 8],
    [1, 4],
    [2, 4],
  ]) {
    await actor(i);
    check(
      (await rows("select * from public.tasks")).length === expected,
      "RLS task count",
    );
    check(
      (await rows("select * from public.objects")).length === 3,
      "RLS object count",
    );
  }
  await actor(1);
  check(
    (await rows("select * from public.tasks where id=$1", [ids["task-2"]]))
      .length === 0,
    "Foreign task must be hidden",
  );
  check(
    (
      await rows("select * from public.task_history where task_id=$1", [
        ids["task-2"],
      ])
    ).length === 0,
    "Foreign history must be hidden",
  );
  await denied(
    "update public.tasks set title=$1 where id=$2",
    ["Forged task", ids["task-1"]],
    "42501",
  );
  await denied(
    "update public.profiles set role=$1 where id=$2",
    ["manager", actorIds[1]],
    "42501",
  );
  await denied(
    "insert into public.task_history(task_id,actor_id,to_status) values($1,$2,$3)",
    [ids["task-1"], actorIds[0], "accepted"],
    "42501",
  );
  await denied(
    "delete from public.task_history where task_id=$1",
    [ids["task-1"]],
    "42501",
  );
  await denied(
    "select public.crm_create_object($1,$2)",
    ["Forbidden", "Test address"],
    "42501",
  );
  await db.exec("reset role; set role anon");
  await denied("select * from public.tasks", [], "42501");
  await denied(
    "select public.crm_create_object($1,$2)",
    ["Forbidden", "Test address"],
    "42501",
  );
  report.push(
    "RLS scopes tasks/history; executor CRUD, role escalation, history tampering and anonymous access are rejected.",
  );
  await actor(0);
  await denied(
    "update public.tasks set status=$1 where id=$2",
    ["accepted", ids["task-1"]],
    "42501",
  );
  const object = (
    await rows(
      "select * from public.crm_create_object('Тестовый объект','Москва, Тестовая, 1')",
    )
  )[0];
  let task = (
    await rows(
      "select * from public.crm_create_task('Тестовая задача','', $1, $2)",
      [object.id, actorIds[1]],
    )
  )[0];
  await actor(2);
  await denied(
    "select public.crm_transition_task($1,$2,$3,$4)",
    [task.id, task.version, "in_progress", null],
    "42501",
  );
  await actor(1);
  task = (
    await rows("select * from public.crm_transition_task($1,$2,$3,$4)", [
      task.id,
      task.version,
      "in_progress",
      null,
    ])
  )[0];
  await denied(
    "select public.crm_transition_task($1,$2,$3,$4)",
    [task.id, 1, "review", null],
    "PT409",
  );
  task = (
    await rows("select * from public.crm_transition_task($1,$2,$3,$4)", [
      task.id,
      task.version,
      "review",
      "Готово",
    ])
  )[0];
  await actor(0);
  await denied(
    "select public.crm_transition_task($1,$2,$3,$4)",
    [task.id, task.version, "revision", " \n\t\u00a0"],
    "23514",
  );
  check(
    (
      await rows("select * from public.task_history where task_id=$1", [
        task.id,
      ])
    ).length === 3,
    "Failed transition must not append history",
  );
  task = (
    await rows("select * from public.crm_transition_task($1,$2,$3,$4)", [
      task.id,
      task.version,
      "revision",
      "Исправить шов",
    ])
  )[0];
  await actor(1);
  task = (
    await rows("select * from public.crm_transition_task($1,$2,$3,$4)", [
      task.id,
      task.version,
      "in_progress",
      null,
    ])
  )[0];
  task = (
    await rows("select * from public.crm_transition_task($1,$2,$3,$4)", [
      task.id,
      task.version,
      "review",
      null,
    ])
  )[0];
  await actor(0);
  task = (
    await rows("select * from public.crm_transition_task($1,$2,$3,$4)", [
      task.id,
      task.version,
      "accepted",
      null,
    ])
  )[0];
  check(
    task.status === "accepted" && Number(task.version) === 7,
    "Full revision cycle and version",
  );
  const history = await rows(
    "select * from public.task_history where task_id=$1 order by created_at,id",
    [task.id],
  );
  assert.deepEqual(
    history.map((event) => event.actor_id),
    [
      actorIds[0],
      actorIds[1],
      actorIds[1],
      actorIds[0],
      actorIds[1],
      actorIds[1],
      actorIds[0],
    ],
  );
  assertions++;
  task = (
    await rows("select * from public.crm_update_task($1,$2,$3,$4,$5,$6)", [
      task.id,
      task.version,
      task.title,
      task.description,
      object.id,
      actorIds[2],
    ])
  )[0];
  await actor(1);
  check(
    (await rows("select * from public.tasks where id=$1", [task.id])).length ===
      0,
    "Old assignee loses access",
  );
  await actor(2);
  check(
    (
      await rows("select * from public.task_history where task_id=$1", [
        task.id,
      ])
    ).length === 7,
    "New assignee sees complete history",
  );
  check(
    (await rows("select * from public.profiles where id=$1", [actorIds[1]]))
      .length === 1,
    "History actor profile is readable",
  );
  await actor(0);
  await query("select public.crm_delete_task($1,$2)", [task.id, task.version]);
  check(
    (await rows("select * from public.tasks where id=$1", [task.id])).length ===
      0,
    "Archived task hidden",
  );
  check(
    (
      await rows("select * from public.task_history where task_id=$1", [
        task.id,
      ])
    ).length === 0,
    "Archived history hidden through RLS",
  );
  await query("select public.crm_delete_object($1,$2)", [
    object.id,
    object.version,
  ]);
  await db.exec("reset role");
  check(
    (
      await rows("select * from public.task_history where task_id=$1", [
        task.id,
      ])
    ).length === 7,
    "Archived history retained physically",
  );
  await denied(
    "delete from public.task_history where task_id=$1",
    [task.id],
    "42501",
  );
  report.push(
    "Full revision cycle, immutable actor/time, optimistic version conflicts, atomic failure, reassignment and archive retention verified.",
  );

  const statuses = ["new", "in_progress", "review", "revision", "accepted"];
  let matrix = 0;
  for (const userIndex of [0, 1, 2])
    for (const from of statuses)
      for (const to of statuses) {
        await db.exec("reset role");
        const current = (
          await rows(
            "insert into public.tasks(title,object_id,assignee_id,status,author_id) values($1,$2,$3,$4,$5) returning *",
            [
              "Матрица переходов",
              ids["object-1"],
              actorIds[1],
              from,
              actorIds[0],
            ],
          )
        )[0];
        await actor(userIndex);
        const allowed =
          userIndex === 0
            ? from === "review" && ["accepted", "revision"].includes(to)
            : userIndex === 1 &&
              ((["new", "revision"].includes(from) && to === "in_progress") ||
                (from === "in_progress" && to === "review"));
        if (allowed) {
          const changed = (
            await rows("select * from public.crm_transition_task($1,1,$2,$3)", [
              current.id,
              to,
              "Причина",
            ])
          )[0];
          check(changed.status === to, "Allowed transition");
        } else
          await denied("select public.crm_transition_task($1,1,$2,$3)", [
            current.id,
            to,
            "Причина",
          ]);
        matrix++;
      }
  await db.exec("reset role");
  const definer = await rows(
    "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'crm_%' and p.prosecdef",
  );
  check(definer.length === 0, "No exposed definer RPC");
  report.push(
    `${matrix} role/status combinations verified (manager, assignee, other executor). Exposed RPC wrappers use SECURITY INVOKER.`,
  );
  const result = {
    engine: "PGlite PostgreSQL/WASM",
    cloudSupabaseTested: false,
    assertions,
    matrixCases: matrix,
    fixtureCounts: counts,
    checks: report,
  };
  mkdirSync("output/qa", { recursive: true });
  writeFileSync(
    "output/qa/database.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.close();
}
