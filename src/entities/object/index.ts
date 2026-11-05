import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
export type { ConstructionObject, ObjectInput } from "@/shared/api";
export const objectsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["crm", userId, "objects"],
    queryFn: () => api.objects.list(),
  });
export const objectQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["crm", userId, "object", id],
    queryFn: () => api.objects.get(id),
  });
