import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { ObjectCard } from "./ui/object-card";
import { ObjectsOverview } from "./ui/objects-overview";
import { useDebounce } from "@/shared/lib/use-debounce";
import { useSession } from "@/entities/session";
import { objectsQuery } from "@/entities/object";
import { ObjectForm } from "@/features/object-form";
import { Input } from "@/shared/ui/input";
import { Pagination } from "@/shared/ui/pagination";
import { EmptyState, ErrorState, LoadingScreen } from "@/shared/ui/states";
export default function ObjectsPage() {
  const { user } = useSession();
  const manager = user!.role === "manager";
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebounce(search, 300);
  const query = useQuery({
    ...objectsQuery(user!.id, {
      search: debouncedSearch.trim(),
      pageIndex,
      pageSize,
    }),
    placeholderData: keepPreviousData,
  });
  if (query.error)
    return (
      <ErrorState
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data) return <LoadingScreen />;
  const page = query.data;
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
      <ObjectsOverview summary={page.summary} manager={manager} />
      <div className="objects-toolbar">
        <div className="search-field">
          <Search size={18} />
          <Input
            aria-label="Поиск объектов"
            maxLength={200}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageIndex(0);
            }}
            placeholder="Поиск по названию или адресу…"
          />
        </div>
        <span>
          {page.items.length} из {page.total} объектов
        </span>
      </div>
      <div aria-busy={query.isFetching}>
        {page.items.length ? (
          <div className="objects-grid">
            {page.items.map((obj, index) => (
              <ObjectCard
                key={obj.id}
                obj={obj}
                index={index}
                manager={manager}
              />
            ))}
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
      </div>
      <Pagination
        {...page}
        label="Пагинация объектов"
        disabled={query.isFetching}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />
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
