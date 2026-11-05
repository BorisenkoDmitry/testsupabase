export type Role = "manager" | "executor";
export type TaskStatus =
  | "new"
  | "in_progress"
  | "review"
  | "revision"
  | "accepted";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
}
export interface ConstructionObject {
  version: number;
  id: string;
  name: string;
  address: string;
  createdAt: string;
}
export interface Task {
  version: number;
  id: string;
  title: string;
  description: string;
  objectId: string;
  assigneeId: string;
  status: TaskStatus;
  authorId: string;
  createdAt: string;
}
export interface TaskHistory {
  id: string;
  taskId: string;
  actorId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  comment: string | null;
  createdAt: string;
}
export type ObjectInput = Pick<ConstructionObject, "name" | "address">;
export type TaskInput = Pick<
  Task,
  "title" | "description" | "objectId" | "assigneeId"
>;
export type SortDirection = "asc" | "desc";
export type TaskSort = "title" | "status" | "assigneeName" | "createdAt";
export interface PageRequest {
  pageIndex?: number;
  pageSize?: number;
}
export interface TaskListRequest extends PageRequest {
  search?: string;
  objectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  sortBy?: TaskSort;
  sortDirection?: SortDirection;
}
export interface ObjectListRequest extends PageRequest {
  search?: string;
  sortBy?: "name" | "address" | "createdAt";
  sortDirection?: SortDirection;
}
export interface Page<T> {
  items: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}
export interface TaskListItem extends Task {
  objectName: string;
  assigneeName: string;
}
export interface TaskSummary {
  total: number;
  newCount: number;
  inProgressCount: number;
  reviewCount: number;
}
export interface TaskPage extends Page<TaskListItem> {
  summary: TaskSummary;
}
export interface ObjectListItem extends ConstructionObject {
  taskCount: number;
  acceptedCount: number;
  reviewCount: number;
}
export interface ObjectSummary {
  objectCount: number;
  activeTaskCount: number;
  reviewCount: number;
}
export interface ObjectPage extends Page<ObjectListItem> {
  summary: ObjectSummary;
}
export type ObjectOption = Pick<ConstructionObject, "id" | "name">;
export interface CrmApi {
  auth: {
    getSession(): Promise<User | null>;
    signIn(email: string, password: string): Promise<User>;
    signOut(): Promise<void>;
    onSessionChange?(listener: () => void): () => void;
  };
  users: {
    list(assigneesOnly?: boolean, signal?: AbortSignal): Promise<User[]>;
  };
  objects: {
    list(
      request?: ObjectListRequest,
      signal?: AbortSignal,
    ): Promise<ObjectPage>;
    options(signal?: AbortSignal): Promise<ObjectOption[]>;
    get(id: string): Promise<ConstructionObject>;
    save(
      input: ObjectInput,
      id?: string,
      expectedVersion?: number,
    ): Promise<ConstructionObject>;
    remove(id: string, expectedVersion?: number): Promise<void>;
  };
  tasks: {
    list(request?: TaskListRequest, signal?: AbortSignal): Promise<TaskPage>;
    get(id: string): Promise<Task>;
    save(
      input: TaskInput,
      id?: string,
      expectedVersion?: number,
    ): Promise<Task>;
    remove(id: string, expectedVersion?: number): Promise<void>;
    transition(
      id: string,
      status: TaskStatus,
      comment?: string,
      expectedVersion?: number,
    ): Promise<Task>;
    history(
      id: string,
      request?: PageRequest,
      signal?: AbortSignal,
    ): Promise<Page<TaskHistory>>;
  };
}
