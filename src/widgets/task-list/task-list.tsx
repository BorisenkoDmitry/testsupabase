import { filtersReset, useFiltersDispatch } from "@/features/task-filters";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/states";
import { useTaskTable } from "./model/use-task-table";
import type { TaskListProps } from "./model/types";
import { TaskToolbar } from "./ui/task-toolbar";

export function TaskList(props: TaskListProps) {
  const { tasks, objects, users, manager, showObject = true } = props;
  const { table, active } = useTaskTable(props);
  const dispatch = useFiltersDispatch();
  const count = table.getRowModel().rows.length;
  return (
    <section className="task-list" aria-label="Список задач">
      <TaskToolbar
        users={users}
        objects={objects}
        manager={manager}
        showObject={showObject}
        active={active}
      />
      {count ? (
        <DataTable table={table} />
      ) : (
        <EmptyState
          title={active ? "Ничего не найдено" : "Задач пока нет"}
          description={
            active
              ? "Измените запрос или сбросьте фильтры."
              : manager
                ? "Создайте первую задачу и назначьте исполнителя."
                : "Здесь появятся назначенные вам задачи."
          }
        >
          {active && (
            <Button variant="outline" onClick={() => dispatch(filtersReset())}>
              Сбросить фильтры
            </Button>
          )}
        </EmptyState>
      )}
      <div className="list-footer">
        Показано задач: {count} из {tasks.length}
        <span>Изменения сохраняются автоматически</span>
      </div>
    </section>
  );
}
