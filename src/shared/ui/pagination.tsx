import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
export function Pagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  label = "Пагинация",
}: {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label={label}>
      <label className="pagination-size">
        На странице
        <select
          aria-label="Записей на странице"
          value={pageSize}
          disabled={disabled}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="pagination-controls">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Предыдущая страница"
          disabled={disabled || pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span aria-live="polite">
          Страница {pageIndex + 1} из {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Следующая страница"
          disabled={disabled || pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </nav>
  );
}
