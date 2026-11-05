import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api, isConflict } from "@/shared/api";
export function useDeleteRecord(
  type: "object" | "task",
  id: string,
  redirect: string,
  expectedVersion: number,
) {
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (version: number = expectedVersion) =>
      type === "object"
        ? api.objects.remove(id, version)
        : api.tasks.remove(id, version),
    onSuccess: async () => {
      navigate(redirect, { replace: true });
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success(type === "object" ? "Объект удалён" : "Задача удалена");
    },
    onError: async (error: Error) => {
      toast.error(error.message);
      if (isConflict(error))
        await client.invalidateQueries({ queryKey: ["crm"] });
    },
  });
}
