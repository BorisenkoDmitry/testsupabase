import { Search, X } from "lucide-react";
import { statusLabels, statusOrder } from "@/entities/task";
import type { ObjectOption } from "@/entities/object";
import type { User } from "@/entities/user";
import {
  filtersChanged,
  filtersReset,
  useFiltersDispatch,
  useTaskFilters,
} from "@/features/task-filters";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export function TaskToolbar({
  users,
  objects,
  manager,
  showObject,
  active,
}: {
  users: User[];
  objects: ObjectOption[];
  manager: boolean;
  showObject: boolean;
  active: boolean;
}) {
  const filters = useTaskFilters();
  const dispatch = useFiltersDispatch();
  return (
    <div className="list-toolbar">
      <div className="search-field">
        <Search size={18} />
        <Input
          aria-label="Поиск задач"
          placeholder="Найти задачу…"
          maxLength={200}
          value={filters.search}
          onChange={(e) => dispatch(filtersChanged({ search: e.target.value }))}
        />
      </div>
      <div className="filter-controls">
        {showObject && (
          <Select
            value={filters.objectId}
            onValueChange={(objectId) => dispatch(filtersChanged({ objectId }))}
          >
            <SelectTrigger aria-label="Фильтр по объекту">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все объекты</SelectItem>
              {objects.map((object) => (
                <SelectItem key={object.id} value={object.id}>
                  {object.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.status}
          onValueChange={(status) =>
            dispatch(
              filtersChanged({ status: status as typeof filters.status }),
            )
          }
        >
          <SelectTrigger aria-label="Фильтр по статусу">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statusOrder.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {manager && (
          <Select
            value={filters.assigneeId}
            onValueChange={(assigneeId) =>
              dispatch(filtersChanged({ assigneeId }))
            }
          >
            <SelectTrigger aria-label="Фильтр по исполнителю">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все исполнители</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {active && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Сбросить фильтры"
            onClick={() => dispatch(filtersReset())}
          >
            <X size={17} />
          </Button>
        )}
      </div>
    </div>
  );
}
