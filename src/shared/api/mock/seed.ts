import type { ConstructionObject, Task, TaskHistory, User } from "../contracts";

export const DEMO_PASSWORD = "Demo123!";
export const demoUsers: User[] = [
  {
    id: "user-manager",
    name: "Александр Волков",
    email: "manager@demo.ru",
    role: "manager",
  },
  {
    id: "user-ivan",
    name: "Иван Петров",
    email: "ivan@demo.ru",
    role: "executor",
  },
  {
    id: "user-alexey",
    name: "Алексей Смирнов",
    email: "alexey@demo.ru",
    role: "executor",
  },
];
export interface MockDatabase {
  version: 1;
  objects: ConstructionObject[];
  tasks: Task[];
  history: TaskHistory[];
}
export function createSeed(): MockDatabase {
  const objects: ConstructionObject[] = [
    {
      id: "object-1",
      version: 1,
      name: "ЖК «Сосновый»",
      address: "Москва, ул. Лесная, 15 · Корпус 2",
      createdAt: "2026-10-20T09:00:00Z",
    },
    {
      id: "object-2",
      version: 1,
      name: "Бизнес-центр «Горизонт»",
      address: "Москва, Ленинградский проспект, 36",
      createdAt: "2026-10-22T09:00:00Z",
    },
    {
      id: "object-3",
      version: 1,
      name: "Дом в Репино",
      address: "Московская область, пос. Репино, участок 8",
      createdAt: "2026-10-25T09:00:00Z",
    },
  ];
  const rows: [string, string, string, string, Task["status"], string][] = [
    [
      "task-1",
      "Смонтировать электропроводку на первом этаже",
      "object-1",
      "user-ivan",
      "in_progress",
      "Проложить кабель по согласованной схеме. Проверить маркировку линий и подготовить фотографии перед закрытием штроб.",
    ],
    [
      "task-2",
      "Проверить гидроизоляцию подвала",
      "object-1",
      "user-alexey",
      "review",
      "Проверить примыкания и швы. Приложить результаты осмотра в комментарии при отправке на проверку.",
    ],
    [
      "task-3",
      "Установить окна в подъезде № 1",
      "object-1",
      "user-ivan",
      "new",
      "Установить оконные блоки на втором этаже. Проверить геометрию и герметичность монтажных швов.",
    ],
    [
      "task-4",
      "Исправить стяжку в холле",
      "object-2",
      "user-alexey",
      "revision",
      "Устранить неровности основания перед укладкой напольного покрытия.",
    ],
    [
      "task-5",
      "Подготовить стены под покраску",
      "object-2",
      "user-ivan",
      "new",
      "Зашпаклевать стены в кабинетах 201–204. После высыхания выполнить шлифовку.",
    ],
    [
      "task-6",
      "Принять поставку вентиляционного оборудования",
      "object-2",
      "user-alexey",
      "accepted",
      "Проверить комплектность по накладной и осмотреть оборудование на наличие повреждений.",
    ],
    [
      "task-7",
      "Собрать опалубку фундамента",
      "object-3",
      "user-ivan",
      "in_progress",
      "Выполнить сборку по проекту. Проверить диагонали и закрепление щитов.",
    ],
    [
      "task-8",
      "Проверить разметку участка",
      "object-3",
      "user-alexey",
      "accepted",
      "Сверить оси и отметки с геодезическим планом.",
    ],
  ];
  const tasks: Task[] = rows.map(
    ([id, title, objectId, assigneeId, status, description], index) => ({
      id,
      version: 1,
      title,
      objectId,
      assigneeId,
      status,
      description,
      authorId: "user-manager",
      createdAt: `2026-11-0${(index % 3) + 1}T08:00:00Z`,
    }),
  );
  const history: TaskHistory[] = [];
  for (const task of tasks) {
    const path: Task["status"][] = ["new"];
    if (task.status !== "new") path.push("in_progress");
    if (["review", "revision", "accepted"].includes(task.status))
      path.push("review");
    if (["revision", "accepted"].includes(task.status)) path.push(task.status);
    path.forEach((toStatus, i) =>
      history.push({
        id: `history-${task.id}-${i}`,
        taskId: task.id,
        actorId: i === 0 || i === 3 ? task.authorId : task.assigneeId,
        fromStatus: path[i - 1] ?? null,
        toStatus,
        comment:
          toStatus === "revision"
            ? "У входной группы остался перепад около 8 мм. Выровняйте участок и повторно отправьте на проверку."
            : null,
        createdAt: new Date(
          Date.parse(task.createdAt) + i * 3600000,
        ).toISOString(),
      }),
    );
  }
  return { version: 1, objects, tasks, history };
}
