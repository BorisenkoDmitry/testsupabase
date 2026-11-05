import { useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "./button";
export function ConfirmDelete({
  title,
  description,
  onConfirm,
  disabled = false,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const confirmedAction = useRef(onConfirm);
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) confirmedAction.current = onConfirm;
        setOpen(next);
      }}
    >
      <AlertDialog.Trigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Trash2 size={16} />
          Удалить
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content">
          <AlertDialog.Title className="dialog-title">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            {description}
          </AlertDialog.Description>
          <div className="dialog-footer">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={pending}>
                Отмена
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await confirmedAction.current();
                  setOpen(false);
                } catch {
                  /* Mutation displays a toast. Keep dialog open. */
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending && <Loader2 size={16} className="spin" />}Удалить
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
