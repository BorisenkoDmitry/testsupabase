// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { ConfirmDelete } from "@/shared/ui/confirm-dialog";
afterEach(cleanup);
it("retains the deletion decision from when the confirmation opened", async () => {
  const oldAction = vi.fn(async () => {}),
    newAction = vi.fn(async () => {});
  const props = {
    title: "Удалить задачу?",
    description: "История сохранится.",
  };
  const { rerender } = render(
    <ConfirmDelete {...props} onConfirm={oldAction} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
  rerender(<ConfirmDelete {...props} onConfirm={newAction} />);
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Удалить",
    }),
  );
  await waitFor(() => expect(oldAction).toHaveBeenCalledTimes(1));
  expect(newAction).not.toHaveBeenCalled();
});
it("keeps confirmation open after a rejected delete", async () => {
  const action = vi.fn(async () => {
    throw new Error("Conflict");
  });
  render(
    <ConfirmDelete
      title="Удалить?"
      description="Подтверждение"
      onConfirm={action}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Удалить",
    }),
  );
  await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("alertdialog")).toBeTruthy();
});
