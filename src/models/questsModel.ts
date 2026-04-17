import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";

// Importing types
import type Quest from "../types/quest.ts";

// Creating an interface for updating quests
interface UpdatedQuest {
  name?: string;
  description?: string | null;
  icon?: Buffer | null;
  total_xp?: number | null;
  is_rewardable?: boolean;
  is_tracked?: boolean;
  tracked_at?: Date | null;
  is_completed?: boolean;
  completed_at?: Date | null;
  estimated_time?: number | null;
  actual_time?: number | null;
}

// --- GENERAL CRUD MODEL FUNCTIONS ---

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
      questObj.users_id,
      questObj.name,
      questObj.description,
      questObj.icon,
      questObj.total_xp,
      questObj.is_rewardable,
      questObj.is_tracked,
      questObj.tracked_at,
      questObj.is_completed,
      questObj.completed_at,
      questObj.estimated_time,
      questObj.actual_time,
    ],
  );
  return result.rows[0] ?? null;
};

// Updates a specific quest by id
export const updateQuestService = async (
  id: number,
  questObj: UpdatedQuest,
): Promise<UpdatedQuest | null> => {
  const { query, values } = updateRow(
    "quests",
    id,
    questObj,
    "No parameters for quest update were provided",
  );

  const result = await pool.query<UpdatedQuest>(query, values);
  return result.rows[0] ?? null;
};

// Deletes a specific quest by id
export const deleteQuestService = async (id: number): Promise<Quest | null> => {
  const result = await pool.query<Quest>(
    "DELETE FROM quests WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL FUNCTIONS ---

// Tracks a quest
export const trackQuestService = async (id: number): Promise<Quest | null> => {
  const result = await pool.query<Quest>(
    "UPDATE quests SET is_tracked = true, tracked_at = NOW() WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};
