// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { Pagination } from "@/shared/ui/pagination";
afterEach(cleanup);
it.each([0, 1, 9, 10])(
  "hides the complete pagination block for total=%s and pageSize=10",
  (total) => {
    render(
      <Pagination
        total={total}
        pageSize={10}
        pageIndex={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  },
);
it("shows controls only beyond the page size and sends page and size events", () => {
  const page = vi.fn(),
    size = vi.fn();
  render(
    <Pagination
      total={11}
      pageSize={10}
      pageIndex={0}
      onPageChange={page}
      onPageSizeChange={size}
    />,
  );
  expect(screen.getByText("Страница 1 из 2")).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Предыдущая страница",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Следующая страница" }));
  expect(page).toHaveBeenCalledWith(1);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "20" } });
  expect(size).toHaveBeenCalledWith(20);
});
it("disables next on the final page and all controls during a request", () => {
  const props = {
    total: 21,
    pageSize: 10,
    pageIndex: 2,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };
  const { rerender } = render(<Pagination {...props} />);
  expect(
    (
      screen.getByRole("button", {
        name: "Следующая страница",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  rerender(<Pagination {...props} disabled />);
  expect(
    (
      screen.getByRole("button", {
        name: "Предыдущая страница",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(
    true,
  );
});
