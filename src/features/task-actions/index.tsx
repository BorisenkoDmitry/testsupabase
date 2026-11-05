import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CornerDownLeft, Loader2, Play, Send } from "lucide-react";
import { toast } from "sonner";
import { api, isConflict } from "@/shared/api";
import {
  allowedTransitions,
  statusLabels,
  type Task,
  type TaskStatus,
} from "@/entities/task";
import { useSession } from "@/entities/session";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";
const schema = z.object({
  comment: z.string().trim().max(2000, "Не более 2000 символов."),
});
const revisionSchema = schema.extend({
  comment: z
    .string()
    .trim()
    .min(1, "Опишите, что нужно исправить.")
    .max(2000, "Не более 2000 символов."),
});
const actionLabels: Partial<Record<TaskStatus, string>> = {
  in_progress: "Взять в работу",
  review: "Отправить на проверку",
  accepted: "Принять задачу",
  revision: "На доработку",
};
const actionIcons = {
  in_progress: Play,
  review: Send,
  accepted: Check,
  revision: CornerDownLeft,
  new: Play,
};
export function TaskActions({ task }: { task: Task }) {
  const { user } = useSession();
  const [target, setTarget] = useState<TaskStatus | null>(null);
  const transitions = allowedTransitions(task, user!);
  if (!transitions.length)
    return (
      <div className="workflow-note">
        <Check size={18} />
        <span>
          {task.status === "accepted"
            ? "Задача завершена и принята постановщиком."
            : task.status === "review"
              ? "Результат отправлен. Ожидаем решения постановщика."
              : "Следующее действие — за исполнителем."}
        </span>
      </div>
    );
  return (
    <>
      <div className="task-action-bar">
        <span>Следующий шаг</span>
        <div className="inline-actions">
          {transitions.map((status) => {
            const Icon = actionIcons[status];
            return (
              <Button
                key={status}
                variant={status === "revision" ? "outline" : "default"}
                onClick={() => setTarget(status)}
              >
                <Icon size={16} />
                {actionLabels[status]}
              </Button>
            );
          })}
        </div>
      </div>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{target && actionLabels[target]}</DialogTitle>
          <DialogDescription>
            {target === "revision"
              ? "Расскажите исполнителю, что нужно исправить. Причина сохранится в истории."
              : `Новый статус: «${target ? statusLabels[target] : ""}». Действие будет записано в историю задачи.`}
          </DialogDescription>
          {target && (
            <TransitionForm
              task={task}
              target={target}
              onClose={() => setTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function TransitionForm({
  task,
  target,
  onClose,
}: {
  task: Task;
  target: TaskStatus;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [expectedVersion] = useState(task.version);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ comment: string }>({
    resolver: zodResolver(target === "revision" ? revisionSchema : schema),
    defaultValues: { comment: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ comment }: { comment: string }) =>
      api.tasks.transition(task.id, target, comment, expectedVersion),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success(`Статус: ${statusLabels[target]}`);
      onClose();
    },
    onError: async (error: Error) => {
      toast.error(error.message);
      if (isConflict(error)) {
        onClose();
        await client.invalidateQueries({ queryKey: ["crm"] });
      }
    },
  });
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <Field
        label={
          target === "revision"
            ? "Причина возврата"
            : "Комментарий (необязательно)"
        }
        error={errors.comment?.message}
      >
        {(id) => (
          <Textarea
            id={id}
            rows={4}
            autoFocus
            placeholder={
              target === "revision"
                ? "Что необходимо доработать?"
                : "Что важно знать о результате?"
            }
            aria-invalid={!!errors.comment}
            {...register("comment")}
          />
        )}
      </Field>
      <div className="dialog-footer">
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 size={16} className="spin" />}
          {actionLabels[target]}
        </Button>
      </div>
    </form>
  );
}
