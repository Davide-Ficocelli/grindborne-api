export default interface Quest {
  id?: number;
  usersId: number;
  name: string;
  description?: string | null;
  icon?: Buffer | null; // bytea -> Buffer
  totalXp?: number | null; // calcolato, può mancare o essere NULL
  isRewardable: boolean;
  isTracked: boolean;
  trackedAt?: Date | null; // timestamp, ma inizialmente NULL
  isCompleted: boolean;
  completedAt?: Date | null; // NULL finché non è completata
  estimatedTime?: number | null; // integer minuti, può essere NULL se non rewardable
  actualTime?: number | null; // integer minuti, NULL finché non completi
}
