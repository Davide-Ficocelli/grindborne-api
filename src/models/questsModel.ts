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

// --- Helper functions for completeQuestService ---

// Calculates the difference between two dates and returns it in minutes
const calculateDatesDiff = function (
  endDate: Date = new Date(),
  startDate: Date,
): number {
  const msDiff = endDate.getTime() - startDate.getTime();
  const diffInMinutes = Math.floor(msDiff / (1000 * 60)); // ms -> minutes
  return Math.max(0, diffInMinutes);
};

// Calculates how much XP, in broad terms, a LEVEL-UP for the USER is worth.
// This value is used as a baseline scale to understand how much a quest should reward,
// depending on the user's current level: the higher the level, the more expensive it is to level up.
export function calculateLevelCost(level: number): number {
  const x = (level - 11) * 0.02;
  const xClamped = Math.max(0, x);
  const cost = (xClamped + 0.1) * Math.pow(level + 81, 2) + 1;
  return Math.floor(cost);
}

// Returns the XP multiplier based on the quest's ESTIMATED duration (in minutes).
// The idea is that longer quests have a higher potential XP reward,
// but with an upper cap of 1 to avoid very long quests becoming overpowered.
// If no estimated time is provided, the multiplier is 0 (cannot compute a reward).
const durationMultiplier = function (estimatedMinutes: number | null): number {
  if (!estimatedMinutes) return 0;

  // Breakpoints for estimated duration with their corresponding XP multipliers
  if (estimatedMinutes < 10) return 0.2;
  if (estimatedMinutes < 30) return 0.3;
  if (estimatedMinutes < 60) return 0.4;
  if (estimatedMinutes < 90) return 0.5;
  if (estimatedMinutes < 120) return 0.6;
  if (estimatedMinutes < 150) return 0.7;
  if (estimatedMinutes < 180) return 0.8;
  if (estimatedMinutes < 210) return 0.9;
  return 1; // 210–240 and above → hard cap at 1
};

// Calculates an XP multiplier based on the LEVELS of the attributes involved in this quest.
// The higher the involved attributes, the more the quest "deserves" extra XP.
// If the array is empty, it means a rewardable quest has no attributes: that's an error case.
const questAttributesMultiplier = function (
  questAttributeLevels: number[],
): number {
  if (questAttributeLevels.length === 0) return 0; // rewardable quest without attributes = bug

  const avgQuest =
    questAttributeLevels.reduce((sum, lvl) => sum + lvl, 0) /
    questAttributeLevels.length;

  // Example: average 20 → 1.2 ( +20% XP compared to base )
  return 1 + avgQuest / 100;
};

// Calculates how accurately the USER estimated the time needed for the quest.
// It compares the estimated time with the actual time and returns a multiplier:
// - perfect estimate → 1 (100% XP)
// - the further from the estimate → lower multiplier, down to a minimum of 40%.
// If either timestamp is missing, no bonus/malus is applied (multiplier 1).
const timeAccuracyMultiplier = function (
  estimatedMinutes: number | null,
  actualMinutes: number | null,
): number {
  if (!estimatedMinutes || !actualMinutes) return 1;

  const diff = Math.abs(actualMinutes - estimatedMinutes);
  const relativeDiff = diff / estimatedMinutes; // 0.2 = 20% deviation

  // 0% deviation → 1.0 (100% XP)
  // 50% deviation → 1 - 0.5 * 0.6 = 0.7 (70% XP)
  // 100%+ deviation → clamped to 0.4 (40% minimum XP)
  const multiplier = 1 - relativeDiff * 0.6;
  return Math.max(0.4, multiplier);
};

// Calculates an XP multiplier based on the AVERAGE LEVEL of ALL user attributes.
// This represents how developed the character is overall: more advanced builds
// make quests potentially more rewarding in terms of XP.
// If the user has no attributes, the multiplier is neutral (1).
const overallAttributesMultiplier = function (
  allAttributeLevels: number[],
): number {
  if (allAttributeLevels.length === 0) return 1;

  const avgAll =
    allAttributeLevels.reduce((sum, lvl) => sum + lvl, 0) /
    allAttributeLevels.length;

  // Example: average 10 → 1 + 10/10 = 2.0 (x2)
  //          average 20 → 1 + 20/10 = 3.0 (x3)
  return 1 + avgAll / 10;
};

// Calculates the TOTAL XP reward for a completed quest.
// It combines:
// - the "cost" of a level-up for the user (base scale),
// - how high the quest-related attributes are,
// - how built the character is overall (all attributes),
// - how long the quest is (estimated time),
// - how close the actual time is to the estimate.
// The result is a single XP value (total_xp) to be stored on the quest.
const calculateQuestTotalXP = function (
  userLevel: number,
  questAttributeLevels: number[],
  allAttributeLevels: number[],
  estimatedMinutes: number | null,
  actualMinutes: number | null,
): number {
  if (questAttributeLevels.length === 0) {
    return 0; // safety: a rewardable quest without attributes should not exist
  }

  // Base scale: how much it "costs" to level up the user in XP
  const levelCost = calculateLevelCost(userLevel);

  // Base reward: a "typical" quest is worth about 20% of a level-up
  const baseReward = levelCost * 0.2;

  // Multiplier based on the attributes involved in this quest
  const questAttrMult = questAttributesMultiplier(questAttributeLevels);

  // Multiplier based on the user's overall build (all attributes)
  const overallAttrMult = overallAttributesMultiplier(allAttributeLevels);

  // Time estimation bonus/malus
  const timeMult = timeAccuracyMultiplier(estimatedMinutes, actualMinutes);

  // Duration-based soft cap: longer quests have more potential XP
  const durationMult = durationMultiplier(estimatedMinutes);

  const totalExp =
    baseReward * questAttrMult * overallAttrMult * timeMult * durationMult;

  return Math.floor(totalExp);
};

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
    "SELECT quests.id, quests.name, quests.description, quests.icon, quests.is_rewardable, quests.estimated_time, quests.actual_time, quests.is_tracked, quests.is_completed FROM quests JOIN users ON quests.users_id = users.id WHERE quests.users_id = $1",
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
  // Get quest to be completed
  const questToBeCompleted = await getQuestByIdService(id);

  // If quest to be completed wasn't found then return
  if (!questToBeCompleted)
    return handleResponse(res, 404, "Quest to be completed was not found");

  // Get quest's is_rewardable and estimated_time value
  const { is_rewardable, estimated_time, tracked_at } =
    questToBeCompleted as Quest;

  // Validate quest
  let result;
  // If is not rewardable then just mark the quest as completed and stop the tracking
  if (!is_rewardable)
    result = await pool.query<Quest>(
      `UPDATE quests SET is_tracked = false, is_completed = true, completed_at = NOW()${estimated_time ? ", estimated_time = $2" : ""} WHERE id = $1 RETURNING *`,
      [id, estimated_time],
    );
  // If quest is rewardable calculate total xp and actual time
  else if (is_rewardable) {
    // Calculate the actual time spent to complete the quest
    const completed_at = new Date();
    const actual_time = calculateDatesDiff(completed_at, tracked_at as Date);

    // Calculate total xp reward for quest
    const questTotalXp: number = calculateQuestTotalXP(
      userLevel,
      attributesToQuestLvls,
      userAttributesLvls,
      estimated_time as number,
      actual_time,
    );

    result = await pool.query<Quest>(
      "UPDATE quests SET is_tracked = false, is_completed = true, completed_at = NOW(), estimated_time = $2, total_xp = $3, actual_time = $4 WHERE id = $1 RETURNING *",
      [id, estimated_time, questTotalXp, actual_time],
    );
  } else throw new Error("Something went wrong during quest completion");

  return result.rows[0] ?? null;
};
