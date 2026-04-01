export default interface Attribute {
  id: number;
  name: string;
  description?: string | null;
  level: number | null;
  xp: number | null;
  icon?: Buffer | null; // bytea -> Buffer
  users_id: number;
}
