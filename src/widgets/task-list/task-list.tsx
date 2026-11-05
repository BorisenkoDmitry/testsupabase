import { filtersReset, useFiltersDispatch } from "@/features/task-filters";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { Pagination } from "@/shared/ui/pagination";
import { EmptyState } from "@/shared/ui/states";
import { useDelayedVisible } from "@/shared/lib/use-delayed-visible";
import { useTaskTable } from "./model/use-task-table";
import type { TaskListProps } from "./model/types";
import { TaskToolbar } from "./ui/task-toolbar";
export function TaskList(props: TaskListProps) {
  const { page, objects, users, manager, showObject = true } = props;
  const { table, active } = useTaskTable(props);
  const dispatch = useFiltersDispatch();
  const refreshing = useDelayedVisible(props.isFetching);
  return (
    <section
      className="task-list"
      aria-label="Список задач"
      aria-busy={props.isFetching}
    >
      <TaskToolbar
        users={users}
        objects={objects}
        manager={manager}
        showObject={showObject}
        active={active}
      />
      {refreshing && (
        <p className="list-refresh" role="status">
          Обновляем список…
        </p>
      )}
      {page.items.length ? (
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
        Показано задач: {page.items.length} из {page.total}
        <span>Изменения сохраняются автоматически</span>
      </div>
      <Pagination
        {...page}
        label="Пагинация задач"
        disabled={props.isFetching}
        onPageChange={(pageIndex) =>
          props.onPaginationChange({ pageIndex, pageSize: page.pageSize })
        }
        onPageSizeChange={(pageSize) =>
          props.onPaginationChange({ pageIndex: 0, pageSize })
        }
      />
    </section>
  );
}
