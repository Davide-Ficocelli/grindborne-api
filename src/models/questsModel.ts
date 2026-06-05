import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";

// Importing types
import {
  type QuestInDb,
  type NewQuest,
  type UpdatedQuest,
} from "../types/quest.ts";

// --- GENERAL CRUD MODEL FUNCTIONS ---

// Gets a quest based on its id
export const getQuestByIdModel = async (
  questId: number,
): Promise<QuestInDb | null> => {
  const result = await pool.query<QuestInDb>(
    "SELECT * FROM quests WHERE id = $1",
    [questId],
  );
  return result.rows[0] ?? null;
};

// Gets all quests based on user's id
export const getQuestsByUserIdModel = async (
  userId: number,
): Promise<QuestInDb[] | null> => {
  const result = await pool.query<QuestInDb>(
    "SELECT quests.id, quests.users_id, quests.name, quests.description, quests.icon, quests.is_rewardable, quests.estimated_time, quests.actual_time, quests.is_tracked, quests.is_completed FROM quests JOIN users ON quests.users_id = users.id WHERE quests.users_id = $1",
    [userId],
  );
  return result.rows.length ? result.rows : null;
};

// Creates a quest
export const createNewQuestModel = async (
  questObj: NewQuest,
): Promise<QuestInDb | null> => {
  const result = await pool.query<QuestInDb>(
    "INSERT INTO quests (users_id, name, description, icon, is_rewardable, estimated_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      questObj.users_id,
      questObj.name,
      questObj.description,
      questObj.icon,
      questObj.is_rewardable,
      questObj.estimated_time,
    ],
  );
  return result.rows[0] ?? null;
};

// Updates a specific quest by id
export const updateQuestModel = async (
  questId: number,
  questObj: UpdatedQuest,
): Promise<QuestInDb | null> => {
  const { query, values } = updateRow(
    "quests",
    questId,
    questObj,
    "No parameters for quest update were provided",
  );

  const result = await pool.query<QuestInDb>(query, values);
  return result.rows[0] ?? null;
};

// Deletes a specific quest by id
export const deleteQuestModel = async (
  questId: number,
): Promise<QuestInDb | null> => {
  const result = await pool.query<QuestInDb>(
    "DELETE FROM quests WHERE id = $1 RETURNING *",
    [questId],
  );
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL FUNCTIONS ---

// Tracks a quest
export const trackQuestModel = async (
  questId: number,
): Promise<QuestInDb | null> => {
  const result = await pool.query<QuestInDb>(
    "UPDATE quests SET is_tracked = true, tracked_at = NOW() WHERE id = $1 RETURNING *",
    [questId],
  );
  return result.rows[0] ?? null;
};

// Adds attributes related to the quest in the join table
export const addAttributesToQuestModel = async (
  valuePlaceholders: any[],
  values: string[],
): Promise<{ quests_id: number; attributes_id: number }[]> => {
  const result = await pool.query(
    `INSERT INTO quests_attributes (quests_id, attributes_id) VALUES ${valuePlaceholders.join(", ")} RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
};
