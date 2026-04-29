import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";

// Importing types
import type { Quest, NewQuestInput } from "../types/quest.ts";
import handleResponse from "../utils/handleResponse.ts";

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

// --- HELPER FUNCTIONS ---

// -- Helper functions for completeQuestService --

// Calculates the difference between two dates and returns it in minutes
const calculateDatesDiff = function (
  endDate: Date = new Date(),
  startDate: Date,
): number {
  const msDiff = endDate.getTime() - startDate.getTime();
  const diffInMinutes = Math.floor(msDiff / (1000 * 60)); // ms -> minutes
  return Math.max(0, diffInMinutes);
};

// --- GENERAL CRUD MODEL FUNCTIONS ---

// Gets a quest based on its id
export const getQuestByIdService = async (
  id: number,
): Promise<Quest | null> => {
  const result = await pool.query<Quest>(
    "SELECT * FROM quests WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// Gets all quests based on user's id
export const getQuestsByUserIdService = async (
  userId: number,
): Promise<Quest[] | null> => {
  const result = await pool.query<Quest>(
    "SELECT quests.id, quests.name, quests.description, quests.icon, quests.is_rewardable, quests.estimated_time, quests.actual_time, quests.is_tracked, quests.is_completed FROM quests JOIN users ON quests.users_id = users.id WHERE quests.users_id = $1 RETURNING *;",
    [userId],
  );
  return result.rows.length ? result.rows : null;
};

// Creates a quest
export const createNewQuestService = async (
  questObj: NewQuestInput,
): Promise<NewQuestInput | null> => {
  const result = await pool.query<NewQuestInput>(
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

// Adds attributes related to the quest in the join table
export const addAttributesToQuestService = async (
  questId: number,
  attributes_ids: number[],
): Promise<void> => {
  if (!attributes_ids || attributes_ids.length === 0) return;

  // Let's build a multi-valued query: INSERT INTO quest_attributes(quest_id, attribute_id) VALUES ($1, $2),...
  const values: any[] = [];
  const valuePlaceholders: string[] = [];

  attributes_ids.forEach((attrId, idx) => {
    // for each pair quest/attribute we add two parameters
    const baseIndex = idx * 2;
    valuePlaceholders.push(`($${baseIndex + 1}, $${baseIndex + 2})`);
    values.push(questId, attrId);
  });

  await pool.query(
    `INSERT INTO quests_attributes (quests_id, attributes_id) VALUES ${valuePlaceholders.join(", ")}`,
    values,
  );
};

// Completes a quest
export const completeQuestService = async (
  res: any,
  id: number,
  userLevel: number,
  userAttributesLvls: number[],
  attributesToQuestLvls: number[],
): Promise<Quest | null | void> => {
  // 1) Get quest
  const questToBeCompleted = await getQuestByIdService(id);
  console.dir(questToBeCompleted, { depth: null });

  // If quest to be completed wasn't found then return
  if (!questToBeCompleted)
    return handleResponse(res, 404, "Quest to be completed was not found");

  // 2) Get quest's is_rewardable and estimated_time value
  const { is_rewardable, estimated_time, tracked_at } =
    questToBeCompleted as Quest;

  // 3) Validate quest
  let result;
  // If is not rewardable then just mark the quest as completed and stop the tracking
  if (!is_rewardable)
    result = await pool.query<Quest>(
      `UPDATE quests SET is_tracked = false, is_completed = true, completed_at = NOW()${estimated_time ? ", estimated_time = $2" : ""} WHERE id = $1 RETURNING *`,
      [id, estimated_time],
    );
  // If quest is rewardable calculate total xp and actual time
  else if (is_rewardable) {
    // 4) Calculate the actual time spent to complete the quest
    const completed_at = new Date();
    const actual_time = calculateDatesDiff(completed_at, tracked_at as Date);

    // 5) Calculate total xp reward for quest

    result = await pool.query<Quest>(
      "UPDATE quests SET is_tracked = false, is_completed = true, completed_at = NOW(), estimated_time = $2, total_xp = $3, actual_time = $4 WHERE id = $1 RETURNING *",
      [id, estimated_time, actual_time],
    );
  } else throw new Error("Something went wrong during quest completion");

  return result.rows[0] ?? null;
};
