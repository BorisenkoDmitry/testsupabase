import { useSyncExternalStore, type ReactNode } from "react";
import { Dialog } from "radix-ui";

const query = "(max-width: 760px)";
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const snapshot = () => window.matchMedia(query).matches;

export function Sidebar({
  children,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mobile = useSyncExternalStore(subscribe, snapshot, () => false);
  if (!mobile)
    return (
      <aside id="workspace-sidebar" className="sidebar">
        {children}
      </aside>
    );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sidebar-backdrop" />
        <Dialog.Content
          asChild
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("mobile-menu-trigger")?.focus();
          }}
        >
          <aside id="workspace-sidebar" className="sidebar sidebar-open">
            <Dialog.Title className="sr-only">
              Навигация по рабочему пространству
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Объекты, задачи и текущий аккаунт.
            </Dialog.Description>
            {children}
          </aside>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
