import { ObjectCard } from "./ui/object-card";
import { ObjectsOverview } from "./ui/objects-overview";
import { useDebounce } from "@/shared/lib/use-debounce";
import { useState } from "react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { useSession } from "@/entities/session";
import { objectsQuery } from "@/entities/object";
import { tasksQuery } from "@/entities/task";
import { ObjectForm } from "@/features/object-form";
import { Input } from "@/shared/ui/input";
import { EmptyState } from "@/shared/ui/states";
export default function ObjectsPage() {
  const { user } = useSession();
  const manager = user!.role === "manager";
  const [{ data: objects }, { data: tasks }] = useSuspenseQueries({
    queries: [objectsQuery(user!.id), tasksQuery(user!.id)],
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const visible = objects.filter((obj) =>
    `${obj.name} ${obj.address}`
      .toLowerCase()
      .includes(debouncedSearch.trim().toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Объекты</h1>
          <p>
            {manager
              ? "Ваши стройки и работа команды на каждой из них."
              : "Стройки, на которых вам назначены задачи."}
          </p>
        </div>
        {manager && <ObjectForm />}
      </div>
      <ObjectsOverview objects={objects} tasks={tasks} manager={manager} />
      <div className="objects-toolbar">
        <div className="search-field">
          <Search size={18} />
          <Input
            aria-label="Поиск объектов"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или адресу…"
          />
        </div>
        <span>
          {visible.length} из {objects.length} объектов
        </span>
      </div>
      {visible.length ? (
        <div className="objects-grid">
          {visible.map((obj, index) => {
            return (
              <ObjectCard
                key={obj.id}
                obj={obj}
                tasks={tasks}
                index={index}
                manager={manager}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={debouncedSearch ? "Объекты не найдены" : "Пока нет объектов"}
          description={
            debouncedSearch
              ? "Попробуйте другое название или адрес."
              : manager
                ? "Добавьте первую стройку, чтобы поставить задачи команде."
                : "Объекты появятся, когда вам назначат задачи."
          }
        />
      )}
      <div className="page-context-note">
        <Building2 size={17} />
        <p>
          У каждого объекта — свои задачи, исполнители и история работы.
          {!manager && " Вы видите только свои задачи."}
        </p>
      </div>
    </div>
  );
}
