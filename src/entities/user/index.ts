import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
export type { User, Role } from "@/shared/api";
export const usersQuery = (userId: string) =>
  queryOptions({
    queryKey: ["crm", userId, "users"],
    queryFn: () => api.users.list(),
  });
