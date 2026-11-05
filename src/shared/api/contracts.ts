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
export interface CrmApi {
  auth: {
    getSession(): Promise<User | null>;
    signIn(email: string, password: string): Promise<User>;
    signOut(): Promise<void>;
    onSessionChange?(listener: () => void): () => void;
  };
  users: { list(): Promise<User[]> };
  objects: {
    list(): Promise<ConstructionObject[]>;
    get(id: string): Promise<ConstructionObject>;
    save(
      input: ObjectInput,
      id?: string,
      expectedVersion?: number,
    ): Promise<ConstructionObject>;
    remove(id: string, expectedVersion?: number): Promise<void>;
  };
  tasks: {
    list(): Promise<Task[]>;
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
    history(id: string): Promise<TaskHistory[]>;
  };
}
