export default interface Quest {
  users_id: number;
  name: string;
  description?: string | null;
  icon?: Buffer | null; // bytea -> Buffer
  total_xp?: number | null; // calcolato, può mancare o essere NULL
  is_rewardable: boolean;
  is_tracked: boolean;
  tracked_at?: Date | null; // timestamp, ma inizialmente NULL
  is_completed: boolean;
  completed_at?: Date | null; // NULL finché non è completata
  estimated_time?: number | null; // integer minuti, può essere NULL se non rewardable
  actual_time?: number | null; // integer minuti, NULL finché non completi
}
