import type { CrmApi, Task, User } from "../contracts";
import {
  createSeed,
  DEMO_PASSWORD,
  demoUsers,
  type MockDatabase,
} from "./seed";
import { assertTransition } from "@/shared/lib/task-workflow";

const DATABASE_KEY = "kontur.mock.database.v1";
const SESSION_KEY = "kontur.mock.session.v1";
const delay = () => new Promise((resolve) => setTimeout(resolve, 180));

// This is a UX simulator, not a security boundary. Supabase must enforce RLS and transitions.
export function createMockApi(storage: Storage = localStorage): CrmApi {
  function read(): MockDatabase {
    const raw = storage.getItem(DATABASE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw) as MockDatabase;
        if (
          data.version === 1 &&
          Array.isArray(data.objects) &&
          Array.isArray(data.tasks) &&
          Array.isArray(data.history)
        )
          return data;
      } catch {
        /* Rebuild invalid demo data. */
      }
    }
    const db = createSeed();
    write(db);
    return db;
  }
  function write(db: MockDatabase) {
    storage.setItem(DATABASE_KEY, JSON.stringify(db));
  }
  function actor(): User {
    const user = demoUsers.find(
      (item) => item.id === storage.getItem(SESSION_KEY),
    );
    if (!user) throw new Error("Войдите в систему, чтобы продолжить.");
    return user;
  }
  function manager() {
    const user = actor();
    if (user.role !== "manager")
      throw new Error("Действие доступно только постановщику.");
    return user;
  }
  function canReadTask(task: Task) {
    const user = actor();
    return user.role === "manager" || task.assigneeId === user.id;
  }
  function taskById(db: MockDatabase, id: string) {
    const task = db.tasks.find((item) => item.id === id);
    if (!task || !canReadTask(task))
      throw new Error("Задача не найдена или доступ ограничен.");
    return task;
  }
  function visibleObject(db: MockDatabase, id: string) {
    const user = actor();
    return (
      user.role === "manager" ||
      db.tasks.some(
        (task) => task.objectId === id && task.assigneeId === user.id,
      )
    );
  }
  return {
    auth: {
      async getSession() {
        await delay();
        return (
          demoUsers.find((user) => user.id === storage.getItem(SESSION_KEY)) ??
          null
        );
      },
      async signIn(email, password) {
        await delay();
        const user = demoUsers.find(
          (item) => item.email === email.trim().toLowerCase(),
        );
        if (!user || password !== DEMO_PASSWORD)
          throw new Error("Неверный email или пароль.");
        storage.setItem(SESSION_KEY, user.id);
        return user;
      },
      async signOut() {
        storage.removeItem(SESSION_KEY);
      },
    },
    users: {
      async list() {
        await delay();
        actor();
        return structuredClone(demoUsers);
      },
    },
    objects: {
      async list() {
        await delay();
        const db = read();
        actor();
        return db.objects.filter((obj) => visibleObject(db, obj.id));
      },
      async get(id) {
        await delay();
        const db = read();
        const obj = db.objects.find((item) => item.id === id);
        if (!obj || !visibleObject(db, id))
          throw new Error("Объект не найден или доступ ограничен.");
        return obj;
      },
      async save(input, id) {
        await delay();
        manager();
        const db = read();
        if (!input.name.trim() || !input.address.trim())
          throw new Error("Заполните название и адрес.");
        if (id) {
          const obj = db.objects.find((item) => item.id === id);
          if (!obj) throw new Error("Объект не найден.");
          Object.assign(obj, {
            name: input.name.trim(),
            address: input.address.trim(),
          });
          write(db);
          return obj;
        }
        const obj = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          address: input.address.trim(),
          createdAt: new Date().toISOString(),
          version: 1,
        };
        db.objects.unshift(obj);
        write(db);
        return obj;
      },
      async remove(id) {
        await delay();
        manager();
        const db = read();
        if (db.tasks.some((task) => task.objectId === id))
          throw new Error("Сначала удалите задачи этого объекта.");
        if (!db.objects.some((obj) => obj.id === id))
          throw new Error("Объект не найден.");
        db.objects = db.objects.filter((obj) => obj.id !== id);
        write(db);
      },
    },
    tasks: {
      async list() {
        await delay();
        actor();
        return read().tasks.filter(canReadTask);
      },
      async get(id) {
        await delay();
        return taskById(read(), id);
      },
      async history(id) {
        await delay();
        const db = read();
        taskById(db, id);
        return db.history
          .filter((event) => event.taskId === id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async save(input, id) {
        await delay();
        const user = manager();
        const db = read();
        if (!input.title.trim()) throw new Error("Введите название задачи.");
        if (!db.objects.some((obj) => obj.id === input.objectId))
          throw new Error("Выберите существующий объект.");
        if (
          !demoUsers.some(
            (item) => item.id === input.assigneeId && item.role === "executor",
          )
        )
          throw new Error("Выберите исполнителя.");
        const fields = {
          title: input.title.trim(),
          description: input.description.trim(),
          objectId: input.objectId,
          assigneeId: input.assigneeId,
        };
        if (id) {
          const task = taskById(db, id);

          Object.assign(task, fields);
          task.version = (task.version ?? 1) + 1;
          write(db);
          return task;
        }
        const task: Task = {
          ...fields,
          version: 1,
          id: crypto.randomUUID(),
          status: "new",
          authorId: user.id,
          createdAt: new Date().toISOString(),
        };
        db.tasks.unshift(task);
        db.history.push({
          id: crypto.randomUUID(),
          taskId: task.id,
          actorId: user.id,
          fromStatus: null,
          toStatus: "new",
          comment: null,
          createdAt: task.createdAt,
        });
        write(db);
        return task;
      },
      async remove(id) {
        await delay();
        manager();
        const db = read();
        taskById(db, id);
        db.tasks = db.tasks.filter((task) => task.id !== id);
        db.history = db.history.filter((event) => event.taskId !== id);
        write(db);
      },
      async transition(id, status, comment) {
        await delay();
        const db = read();
        const user = actor();
        const task = taskById(db, id);
        assertTransition(task, user, status, comment);
        db.history.push({
          id: crypto.randomUUID(),
          taskId: id,
          actorId: user.id,
          fromStatus: task.status,
          toStatus: status,
          comment: comment?.trim() || null,
          createdAt: new Date().toISOString(),
        });
        task.status = status;
        task.version = (task.version ?? 1) + 1;
        write(db);
        return task;
      },
    },
  };
}
