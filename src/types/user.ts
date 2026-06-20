export interface UserInDb {
  id: string;
  name: string;
  email: string;
  password_hash?: string | null;
  level?: number | null;
  stamina?: number | null;
}

export type NewUser = Partial<Omit<UserInDb, "id">>;

export type UpdatedUser = Partial<Omit<UserInDb, "id" | "password_hash">>;

export type User = UserInDb | UpdatedUser;
