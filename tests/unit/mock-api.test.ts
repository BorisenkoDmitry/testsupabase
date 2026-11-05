import { beforeEach, describe, expect, it } from "vitest";
import { createMockApi } from "@/shared/api/mock/provider";
import { demoUsers, DEMO_PASSWORD, createSeed } from "@/shared/api/mock/seed";
import {
  allowedTransitions,
  assertTransition,
} from "@/shared/lib/task-workflow";
import type { CrmApi, TaskStatus } from "@/shared/api/contracts";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const statuses: TaskStatus[] = [
  "new",
  "in_progress",
  "review",
  "revision",
  "accepted",
];
describe("task workflow", () => {
  it("allows exactly the specified transition matrix for each role", () => {
    const task = createSeed().tasks[0];
    const expected = {
      manager: { review: ["accepted", "revision"] },
      executor: {
        new: ["in_progress"],
        in_progress: ["review"],
        revision: ["in_progress"],
      },
    } as Record<string, Partial<Record<TaskStatus, TaskStatus[]>>>;
    for (const user of demoUsers.slice(0, 2))
      for (const from of statuses) {
        const current = { ...task, status: from };
        expect(allowedTransitions(current, user)).toEqual(
          expected[user.role][from] ?? [],
        );
        for (const to of statuses) {
          const fn = () => assertTransition(current, user, to, "Причина");
          if (expected[user.role][from]?.includes(to)) expect(fn).not.toThrow();
          else expect(fn).toThrow();
        }
      }
  });
  it("rejects whitespace comments and actions by another executor", () => {
    const task = { ...createSeed().tasks[0], status: "review" as const };
    expect(() =>
      assertTransition(task, demoUsers[0], "revision", "  \n "),
    ).toThrow();
    expect(
      allowedTransitions({ ...task, status: "new" }, demoUsers[2]),
    ).toEqual([]);
  });
});
describe("mock API contract (not database security)", () => {
  let api: CrmApi;
  let storage: Storage;
  beforeEach(() => {
    storage = new MemoryStorage();
    api = createMockApi(storage);
  });
  const login = (api: CrmApi, index: number) =>
    api.auth.signIn(demoUsers[index].email, DEMO_PASSWORD);
  it("rejects anonymous access and invalid credentials", async () => {
    await expect(api.tasks.list()).rejects.toThrow();
    await expect(api.objects.list()).rejects.toThrow();
    await expect(api.auth.signIn("manager@demo.ru", "wrong")).rejects.toThrow();
  });
  it("scopes tasks, objects, details and history to the assigned executor", async () => {
    await login(api, 1);
    expect(
      (await api.tasks.list()).items.every(
        (task) => task.assigneeId === demoUsers[1].id,
      ),
    ).toBe(true);
    await expect(api.tasks.get("task-2")).rejects.toThrow();
    await expect(api.tasks.history("task-2")).rejects.toThrow();
    await expect(api.tasks.transition("task-2", "accepted")).rejects.toThrow();
    await api.auth.signOut();
    await login(api, 0);
    const emptyObject = await api.objects.save({
      name: "Закрытый объект",
      address: "Москва, ул. Новая, 1",
    });
    await api.auth.signOut();
    await login(api, 1);
    expect(
      (await api.objects.list()).items.some((obj) => obj.id === emptyObject.id),
    ).toBe(false);
    await expect(api.objects.get(emptyObject.id)).rejects.toThrow();
  });
  it("rejects executor CRUD even when bypassing the UI", async () => {
    await login(api, 1);
    await expect(
      api.objects.save({ name: "Подмена", address: "Москва" }),
    ).rejects.toThrow();
    await expect(api.objects.remove("object-1")).rejects.toThrow();
    await expect(
      api.tasks.save(
        {
          title: "Подмена",
          description: "",
          objectId: "object-1",
          assigneeId: "user-ivan",
        },
        "task-1",
      ),
    ).rejects.toThrow();
    await expect(api.tasks.remove("task-1")).rejects.toThrow();
  });
  it("records the full revision cycle with real actors and preserves history on failure", async () => {
    await login(api, 0);
    const task = await api.tasks.save({
      title: "Тестовая задача",
      description: "",
      objectId: "object-1",
      assigneeId: "user-ivan",
    });
    await api.auth.signOut();
    await login(api, 1);
    await api.tasks.transition(task.id, "in_progress");
    await api.tasks.transition(task.id, "review", "Готово");
    await api.auth.signOut();
    await login(api, 0);
    await expect(
      api.tasks.transition(task.id, "revision", "  "),
    ).rejects.toThrow();
    expect((await api.tasks.history(task.id)).items).toHaveLength(3);
    await api.tasks.transition(task.id, "revision", "Исправить шов");
    await api.auth.signOut();
    await login(api, 1);
    await api.tasks.transition(task.id, "in_progress");
    await api.tasks.transition(task.id, "review");
    await api.auth.signOut();
    await login(api, 0);
    await api.tasks.transition(task.id, "accepted");
    const history = [...(await api.tasks.history(task.id)).items].reverse();
    expect(history.map((event) => event.toStatus)).toEqual([
      "new",
      "in_progress",
      "review",
      "revision",
      "in_progress",
      "review",
      "accepted",
    ]);
    expect(history.map((event) => event.actorId)).toEqual([
      "user-manager",
      "user-ivan",
      "user-ivan",
      "user-manager",
      "user-ivan",
      "user-ivan",
      "user-manager",
    ]);
    expect(history[3].comment).toBe("Исправить шов");
    await expect(api.tasks.transition(task.id, "new")).rejects.toThrow();
    expect((await api.tasks.history(task.id)).items).toHaveLength(7);
  }, 15000);
  it("does not accept injected status, author or date when saving a task", async () => {
    await login(api, 0);
    const input = {
      title: "Новая задача",
      description: "",
      objectId: "object-1",
      assigneeId: "user-ivan",
      status: "accepted",
      authorId: "user-ivan",
      createdAt: "1990-01-01",
    };
    const task = await api.tasks.save(input);
    expect(task.status).toBe("new");
    expect(task.authorId).toBe("user-manager");
    expect(task.createdAt).not.toBe(input.createdAt);
    const updated = await api.tasks.save(input, task.id);
    expect(updated.status).toBe("new");
    expect(updated.authorId).toBe("user-manager");
  });
  it("validates assignment, permits reassignment, prevents deleting nonempty objects", async () => {
    await login(api, 0);
    await expect(
      api.tasks.save({
        title: "Задача",
        description: "",
        objectId: "object-1",
        assigneeId: "user-manager",
      }),
    ).rejects.toThrow();
    const task = await api.tasks.get("task-1");
    const reassigned = await api.tasks.save(
      { ...task, assigneeId: "user-alexey" },
      task.id,
    );
    expect(reassigned.assigneeId).toBe("user-alexey");
    expect(reassigned.status).toBe(task.status);
    await expect(api.objects.remove("object-1")).rejects.toThrow();
    const empty = await api.objects.save({
      name: "Новый объект",
      address: "Москва, улица Новая",
    });
    await api.objects.remove(empty.id);
    await expect(api.objects.get(empty.id)).rejects.toThrow();
  });
  it("persists data and session across adapter recreation", async () => {
    await login(api, 0);
    const obj = await api.objects.save({
      name: "Сохранённый",
      address: "Москва, Лесная, 1",
    });
    const restored = createMockApi(storage);
    expect((await restored.auth.getSession())?.id).toBe("user-manager");
    expect((await restored.objects.get(obj.id)).name).toBe("Сохранённый");
  });
});
