import { useState, Suspense } from "react";
import { Pencil, Plus } from "lucide-react";
import type { Task } from "@/entities/task";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { TaskFields } from "./ui/task-form-fields";
export function TaskForm({
  task,
  objectId,
}: {
  task?: Task;
  objectId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={task ? "outline" : "default"}>
          {task ? <Pencil size={16} /> : <Plus size={18} />}
          {task ? "Редактировать" : "Новая задача"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {task ? "Редактирование задачи" : "Новая задача"}
        </DialogTitle>
        <DialogDescription>
          {task
            ? "Статус меняется отдельно — через действия в карточке задачи."
            : "Назначьте исполнителя. Задача появится у него в статусе «Новая»."}
        </DialogDescription>
        {open && (
          <Suspense
            fallback={
              <LoadingScreen
                compact
                label="Загружаем объекты и исполнителей…"
              />
            }
          >
            <TaskFields
              task={task}
              objectId={objectId}
              onClose={() => setOpen(false)}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}
