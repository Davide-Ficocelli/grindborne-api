export default interface User {
  id: number;
  name: string;
  email: string;
  password_hash?: string | null;
  level?: number | null;
  stamina?: number | null;
}
