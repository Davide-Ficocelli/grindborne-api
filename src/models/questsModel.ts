import pool from "../config/db.ts";

// Importing types
import type Quest from "../types/quest.ts";

// Gets a quest based on its id
export const getQuestByIdService = async (
  id: number,
): Promise<Quest | null> => {
  const result = await pool.query<Quest>("SELECT * FROM quests WHERE id = $1", [
    id,
  ]);
  return result.rows[0] ?? null;
};

// Gets all quests based on user's id
export const getQuestsByUserIdService = async (
  userId: number,
): Promise<Quest[] | null> => {
  const result = await pool.query<Quest>(
    "SELECT quests.id, quests.name, quests.description, quests.icon, quests.is_rewardable, quests.estimated_time, quests.actual_time, quests.is_tracked, quests.is_completed FROM quests JOIN users ON quests.users_id = users.id WHERE quests.users_id = $1;",
    [userId],
  );
  return result.rows.length ? result.rows : null;
};

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
