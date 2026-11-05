import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, isConflict } from "@/shared/api";
import type { ConstructionObject } from "@/entities/object";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Минимум 2 символа.")
    .max(120, "Не более 120 символов."),
  address: z
    .string()
    .trim()
    .min(5, "Укажите адрес подробнее: минимум 5 символов.")
    .max(250, "Не более 250 символов."),
});
type Values = z.infer<typeof schema>;
export function ObjectFields({
  object,
  onClose,
}: {
  object?: ConstructionObject;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [expectedVersion] = useState(object?.version);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: object?.name ?? "", address: object?.address ?? "" },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      api.objects.save(values, object?.id, expectedVersion),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success(object ? "Объект обновлён" : "Объект создан");
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
      <Field label="Название объекта" error={errors.name?.message}>
        {(id) => (
          <Input
            id={id}
            autoFocus
            placeholder="Например, ЖК «Сосновый»"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
        )}
      </Field>
      <Field label="Адрес" error={errors.address?.message}>
        {(id) => (
          <Input
            id={id}
            placeholder="Город, улица, дом или участок"
            aria-invalid={!!errors.address}
            {...register("address")}
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
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 size={16} className="spin" />}
          {object ? "Сохранить изменения" : "Создать объект"}
        </Button>
      </div>
    </form>
  );
}
