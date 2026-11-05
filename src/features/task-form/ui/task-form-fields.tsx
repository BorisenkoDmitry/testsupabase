import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, isConflict } from "@/shared/api";
import { useSession } from "@/entities/session";
import { objectOptionsQuery } from "@/entities/object";
import { usersQuery } from "@/entities/user";
import type { Task } from "@/entities/task";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Минимум 3 символа.")
    .max(160, "Не более 160 символов."),
  description: z.string().trim().max(5000, "Не более 5000 символов."),
  objectId: z.string().min(1, "Выберите объект."),
  assigneeId: z.string().min(1, "Выберите исполнителя."),
});
type Values = z.infer<typeof schema>;
export function TaskFields({
  task,
  objectId,
  onClose,
}: {
  task?: Task;
  objectId?: string;
  onClose: () => void;
}) {
  const { user } = useSession();
  const [{ data: objects }, { data: users }] = useSuspenseQueries({
    queries: [objectOptionsQuery(user!.id), usersQuery(user!.id, true)],
  });
  const client = useQueryClient();
  const [expectedVersion] = useState(task?.version);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      objectId: task?.objectId ?? objectId ?? "",
      assigneeId: task?.assigneeId ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      api.tasks.save(values, task?.id, expectedVersion),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success(task ? "Задача обновлена" : "Задача создана");
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
      <Field label="Название задачи" error={errors.title?.message}>
        {(id) => (
          <Input
            id={id}
            autoFocus
            placeholder="Что нужно сделать?"
            aria-invalid={!!errors.title}
            {...register("title")}
          />
        )}
      </Field>
      <Field
        label="Описание"
        error={errors.description?.message}
        hint="Необязательно. Добавьте детали и ожидаемый результат."
      >
        {(id) => (
          <Textarea
            id={id}
            rows={4}
            placeholder="Объём работ, требования и важные детали"
            {...register("description")}
          />
        )}
      </Field>
      <Field label="Объект" error={errors.objectId?.message}>
        {(id) => (
          <Controller
            name="objectId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={id}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.objectId}
                >
                  <SelectValue placeholder="Выберите объект" />
                </SelectTrigger>
                <SelectContent>
                  {objects.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>
      <Field
        label="Исполнитель"
        error={errors.assigneeId?.message}
        hint={
          task
            ? "После переназначения прежний исполнитель потеряет доступ к задаче."
            : undefined
        }
      >
        {(id) => (
          <Controller
            name="assigneeId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={id}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.assigneeId}
                >
                  <SelectValue placeholder="Кто выполнит задачу?" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>
      <div className="dialog-footer">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending || objects.length === 0}
        >
          {mutation.isPending && <Loader2 size={16} className="spin" />}
          {task ? "Сохранить изменения" : "Создать задачу"}
        </Button>
      </div>
    </form>
  );
}
