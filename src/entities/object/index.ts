import { queryOptions } from "@tanstack/react-query";
import { api, type ObjectListRequest } from "@/shared/api";
export type {
  ConstructionObject,
  ObjectInput,
  ObjectListItem,
  ObjectOption,
  ObjectSummary,
} from "@/shared/api";
export const objectsQuery = (userId: string, request: ObjectListRequest = {}) =>
  queryOptions({
    queryKey: ["crm", userId, "objects", request],
    queryFn: ({ signal }) => api.objects.list(request, signal),
  });
export const objectOptionsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["crm", userId, "object-options"],
    queryFn: ({ signal }) => api.objects.options(signal),
  });
export const objectQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["crm", userId, "object", id],
    queryFn: () => api.objects.get(id),
  });
