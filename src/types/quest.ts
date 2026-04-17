export interface Quest {
  id: number;
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

export interface QuestRow {
  id: number;
  users_id: number;
  name: string;
  description?: string | null;
  icon?: Buffer | null;
  total_xp?: number | null;
  is_rewardable: boolean;
  is_tracked: boolean;
  tracked_at?: Date | null;
  is_completed: boolean;
  completed_at?: Date | null;
  estimated_time?: number | null;
  actual_time?: number | null;
}

export type NewQuestInput = Omit<QuestRow, "id">;
