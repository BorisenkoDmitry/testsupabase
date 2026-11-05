import type { Task } from "@/entities/task";
import type { ConstructionObject } from "@/entities/object";
import type { User } from "@/entities/user";

export interface TaskListProps {
  tasks: Task[];
  objects: ConstructionObject[];
  users: User[];
  manager: boolean;
  showObject?: boolean;
}
