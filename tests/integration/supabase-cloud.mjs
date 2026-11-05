// Real Auth + PostgREST checks. Run with Node 22+ and ignored .env.supabase.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const {
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: key,
  DEMO_USERS_PASSWORD: password,
  SUPABASE_SECRET_KEY: secret,
} = process.env;
assert(url && key && password && secret, "Configure .env.supabase first.");
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  },
};
const anon = createClient(url, key, options);
const admin = createClient(url, secret, options);
const clients = await Promise.all(
  ["manager", "ivan", "alexey"].map(async (name) => {
    const client = createClient(url, key, options);
    const { data, error } = await client.auth.signInWithPassword({
      email: `${name}@demo.ru`,
      password,
    });
    if (error) throw new Error(`Login failed for ${name}: ${error.message}`);
    return { client, id: data.user.id };
  }),
);
const [manager, ivan, alexey] = clients;
let assertions = 0;
const checks = [];
function ok(condition, label) {
  assert(condition, label);
  assertions++;
  checks.push(label);
}
async function data(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
async function denied(request, label, code) {
  const r = await request;
  ok(!!r.error && (!code || r.error.code === code), label);
  return r;
}
async function rpc(actor, name, args) {
  return data(actor.client.rpc(name, args).single());
}
let object, task;
try {
  await denied(anon.from("tasks").select("*"), "Anonymous cannot read tasks");
  await denied(
    anon.rpc("crm_create_object", {
      p_name: "Forbidden",
      p_address: "Forbidden",
    }),
    "Anonymous cannot call writes",
  );
  const all = await data(manager.client.from("tasks").select("*"));
  ok(all.length === 8, "Manager sees 8 initial tasks");
  for (const actor of [ivan, alexey]) {
    const own = await data(actor.client.from("tasks").select("*"));
    ok(
      own.length === 4 && own.every((t) => t.assignee_id === actor.id),
      "Executor sees only 4 assigned tasks",
    );
    const foreign = all.find((t) => t.assignee_id !== actor.id);
    ok(
      (await data(actor.client.from("tasks").select("*").eq("id", foreign.id)))
        .length === 0,
      "Foreign task UUID is hidden",
    );
    ok(
      (
        await data(
          actor.client
            .from("task_history")
            .select("*")
            .eq("task_id", foreign.id),
        )
      ).length === 0,
      "Foreign task history is hidden",
    );
    await denied(
      actor.client.rpc("crm_create_object", {
        p_name: "Forbidden",
        p_address: "Forbidden",
      }),
      "Executor cannot create objects",
    );
    await denied(
      actor.client.rpc("crm_update_task", {
        p_id: foreign.id,
        p_expected_version: foreign.version,
        p_title: "Hacked",
        p_description: "",
        p_object_id: foreign.object_id,
        p_assignee_id: actor.id,
      }),
      "Executor cannot edit tasks",
    );
    await denied(
      actor.client.rpc("crm_delete_task", {
        p_id: foreign.id,
        p_expected_version: foreign.version,
      }),
      "Executor cannot delete tasks",
    );
    await denied(
      actor.client.rpc("crm_transition_task", {
        p_id: foreign.id,
        p_expected_version: foreign.version,
        p_to_status: "in_progress",
      }),
      "Executor cannot transition foreign task",
    );
    const visibleObjects = await data(actor.client.from("objects").select("*"));
    ok(
      visibleObjects.every((o) => own.some((t) => t.object_id === o.id)),
      "Only objects with assigned tasks are visible",
    );
  }
  for (const { client, id } of clients) {
    await denied(
      client.from("profiles").update({ role: "manager" }).eq("id", id),
      "Profile roles cannot be changed directly",
    );
    await denied(
      client.from("tasks").update({ status: "accepted" }).eq("id", all[0].id),
      "Direct status update denied",
    );
    await denied(
      client
        .from("tasks")
        .insert({
          title: "Forged",
          object_id: all[0].object_id,
          assignee_id: ivan.id,
          author_id: id,
        }),
      "Direct task insert denied",
    );
    await denied(
      client
        .from("task_history")
        .insert({ task_id: all[0].id, actor_id: id, to_status: "new" }),
      "Forged history insert denied",
    );
    await denied(
      client
        .from("task_history")
        .update({ comment: "Hacked" })
        .eq("task_id", all[0].id),
      "History update denied",
    );
    await denied(
      client.from("task_history").delete().eq("task_id", all[0].id),
      "History delete denied",
    );
  }
  object = await rpc(manager, "crm_create_object", {
    p_name: "Проверка доступа (временно)",
    p_address: "Тестовый объект для автоматической проверки",
  });
  ok(
    object.created_by === manager.id && object.version === 1,
    "Object author and version generated by server",
  );
  ok(
    (await data(ivan.client.from("objects").select("*").eq("id", object.id)))
      .length === 0,
    "Empty object hidden from executor",
  );
  task = await rpc(manager, "crm_create_task", {
    p_title: "Проверка рабочего цикла",
    p_description: "Автоматический тест",
    p_object_id: object.id,
    p_assignee_id: ivan.id,
  });
  ok(
    task.status === "new" && task.author_id === manager.id,
    "Task initial status and author generated by server",
  );
  await denied(
    manager.client.rpc("crm_delete_object", {
      p_id: object.id,
      p_expected_version: object.version,
    }),
    "Nonempty object cannot be deleted",
  );
  const transition = async (actor, status, comment) => {
    task = await rpc(actor, "crm_transition_task", {
      p_id: task.id,
      p_expected_version: task.version,
      p_to_status: status,
      p_comment: comment,
    });
  };
  await denied(
    manager.client.rpc("crm_transition_task", {
      p_id: task.id,
      p_expected_version: task.version,
      p_to_status: "accepted",
    }),
    "New to accepted is forbidden",
  );
  await denied(
    manager.client.rpc("crm_transition_task", {
      p_id: task.id,
      p_expected_version: task.version,
      p_to_status: "in_progress",
    }),
    "Manager cannot take executor task",
  );
  await transition(ivan, "in_progress");
  await transition(ivan, "review");
  const before = await data(
    manager.client.from("task_history").select("*").eq("task_id", task.id),
  );
  for (const comment of [null, "", "   ", "\u00a0"])
    await denied(
      manager.client.rpc("crm_transition_task", {
        p_id: task.id,
        p_expected_version: task.version,
        p_to_status: "revision",
        p_comment: comment,
      }),
      "Revision requires nonblank comment",
    );
  ok(
    (
      await data(
        manager.client.from("task_history").select("*").eq("task_id", task.id),
      )
    ).length === before.length,
    "Rejected transitions do not write history",
  );
  await transition(manager, "revision", "Исправить примыкание");
  await transition(ivan, "in_progress");
  await transition(ivan, "review");
  await transition(manager, "accepted");
  const history = await data(
    manager.client
      .from("task_history")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at"),
  );
  ok(
    history.map((h) => h.to_status).join(",") ===
      "new,in_progress,review,revision,in_progress,review,accepted",
    "Full revision cycle recorded atomically",
  );
  ok(
    history[3].comment === "Исправить примыкание" &&
      history[3].actor_id === manager.id,
    "History contains authentic actor and comment",
  );
  await denied(
    ivan.client.rpc("crm_transition_task", {
      p_id: task.id,
      p_expected_version: task.version,
      p_to_status: "in_progress",
    }),
    "Accepted task cannot reopen",
  );
  const version = task.version;
  const fields = {
    p_id: task.id,
    p_expected_version: version,
    p_title: task.title,
    p_description: task.description,
    p_object_id: object.id,
    p_assignee_id: alexey.id,
  };
  const concurrent = await Promise.all([
    manager.client.rpc("crm_update_task", fields).single(),
    manager.client.rpc("crm_update_task", fields).single(),
  ]);
  ok(
    concurrent.filter((r) => !r.error).length === 1 &&
      concurrent.some((r) => r.error?.code === "PT409"),
    "Concurrent writes: one succeeds, one gets version conflict",
  );
  task = concurrent.find((r) => !r.error).data;
  ok(task.status === "accepted", "Reassignment preserves status");
  ok(
    (await data(ivan.client.from("tasks").select("*").eq("id", task.id)))
      .length === 0,
    "Old assignee loses task",
  );
  ok(
    (
      await data(
        ivan.client.from("task_history").select("*").eq("task_id", task.id),
      )
    ).length === 0,
    "Old assignee loses history",
  );
  ok(
    (
      await data(
        alexey.client.from("task_history").select("*").eq("task_id", task.id),
      )
    ).length === 7,
    "New assignee sees complete history",
  );
  await data(
    manager.client.rpc("crm_delete_task", {
      p_id: task.id,
      p_expected_version: task.version,
    }),
  );
  const taskId = task.id;
  task = null;
  ok(
    (await data(manager.client.from("tasks").select("*").eq("id", taskId)))
      .length === 0,
    "Archived task is hidden",
  );
  ok(
    (await data(admin.from("task_history").select("id").eq("task_id", taskId)))
      .length === 7,
    "Audit history survives task deletion",
  );
  const settings = await (
    await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
  ).json();
  const registrationClosed = settings.disable_signup === true;
  ok(
    registrationClosed,
    "Open registration is disabled in actual Auth settings",
  );
  ok(
    settings.external?.anonymous_users === false,
    "Anonymous sign-in is disabled",
  );
  await denied(
    anon.schema("private").from("profiles").select("*"),
    "Private schema is not exposed through Data API",
  );
  const report = {
    checkedAt: new Date().toISOString(),
    assertions,
    checks,
    registrationClosed,
    anonymousSignInEnabled: settings.external?.anonymous_users ?? null,
  };
  fs.mkdirSync("output/qa", { recursive: true });
  fs.writeFileSync(
    "output/qa/supabase-cloud.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (task) {
    const current = await data(
      manager.client.from("tasks").select("*").eq("id", task.id).maybeSingle(),
    );
    if (current)
      await data(
        manager.client.rpc("crm_delete_task", {
          p_id: current.id,
          p_expected_version: current.version,
        }),
      );
  }
  if (object)
    await manager.client.rpc("crm_delete_object", {
      p_id: object.id,
      p_expected_version: object.version,
    });
  await Promise.all(
    clients.map(({ client }) => client.auth.signOut({ scope: "local" })),
  );
}
