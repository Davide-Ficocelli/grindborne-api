import pool from "../config/db.ts";

// Importing types
import type Quest from "../types/quest.ts";

// Creates a quest
export const createNewQuestService = async (
  questObj: Quest,
): Promise<Quest | null> => {
  const result = await pool.query<Quest>(
    "INSERT INTO quests (users_id, name, description, icon, total_xp, is_rewardable, is_tracked, tracked_at, is_completed, completed_at, estimated_time, actual_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
    [
      questObj.usersId,
      questObj.name,
      questObj.description,
      questObj.icon,
      questObj.totalXp,
      questObj.isRewardable,
      questObj.isTracked,
      questObj.trackedAt,
      questObj.isCompleted,
      questObj.completedAt,
      questObj.estimatedTime,
      questObj.actualTime,
    ],
  );
  return result.rows[0] ?? null;
};
