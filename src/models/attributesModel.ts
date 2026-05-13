import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";
import { calculateUserLvl, assignNewUserLvlService } from "./usersModel.ts";

// Importing types
import type Attribute from "../types/attribute.ts";
import handleResponse from "../utils/handleResponse.ts";
import { debug } from "node:console";

// -- HELPER FUNCTIONS --

// Determines whether a new level up is required
const isLevelUpRequired = (
  remainingXpToDistribute: number,
  xpToNext: number,
): boolean => remainingXpToDistribute >= xpToNext;

// Calculates how much XP is needed to go from current level to next level for an ATTRIBUTE
export function calculateNextLevelThreshold(level: number): number {
  const base = 100; // XP needed to go from level 1 to 2
  const scale = 0.2; // each new level increases the requirement by 20%

  // level 1 -> 100
  // level 2 -> 120
  // level 3 -> 140
  const cost = base * (1 + (level - 1) * scale);
  return Math.round(cost);
}

// --- GENERAL CRUD METHODS ---

// Inserts new attribute in the attributes table given the params from the request body and user's id from the JWT token
export const createNewAttributeService = async (
  name: string,
  description: string,
  icon: Buffer | null,
  userId: number,
): Promise<Attribute | null> => {
  // Represents the initial value of xp for the new attribute to reach level 2
  const initialXpToNext = 100;

  const result = await pool.query<Attribute>(
    "INSERT INTO attributes (name, description, icon, users_id, xp_to_next_level) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [name, description, icon, userId, initialXpToNext],
  );
  return result.rows[0] ?? null;
};

// Gets a specific attribute by its id
export const getAttributeByIdService = async (
  id: number,
): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "SELECT * FROM attributes WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
};

// Gets all user attributes by user id
export const getAttributesByUserIdService = async (
  userId: number,
): Promise<Attribute[] | null> => {
  const result = await pool.query<Attribute>(
    `SELECT
    attributes.id,
    attributes.users_id,
    attributes.name,
    attributes.description,
    attributes.level,
    attributes.icon,
    attributes.xp,
    attributes.xp_to_next_level,
    attributes.decay_date
    FROM attributes
    JOIN users ON attributes.users_id = users.id
    WHERE attributes.users_id = $1`,
    [userId],
  );
  return result.rows.length ? result.rows : null;
};

// Deletes a specific attribute by id
export const deleteAttributeService = async (
  id: number,
): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "DELETE FROM attributes WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// Updates a specific attribute by id
export const updateAttributeService = async (
  id: number,
  name?: string,
  description?: string,
  level?: number,
  xp?: number,
): Promise<Attribute | null> => {
  const { query, values } = updateRow(
    "attributes",
    id,
    {
      name,
      description,
      level,
      xp,
    },
    "No parameters for attribute update were provided",
  );

  const result = await pool.query<Attribute>(query, values);
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestService = async (
  questId: number,
): Promise<Attribute[] | null> => {
  const result = await pool.query<Attribute>(
    `SELECT 
    attributes.id,
    attributes.users_id,
    attributes.name,
    attributes.description,
    attributes.level,
    attributes.icon,
    attributes.xp,
    attributes.xp_to_next_level,
    attributes.decay_date
    FROM
    attributes
    JOIN quests_attributes ON attributes.id = quests_attributes.attributes_id
    JOIN quests ON quests_attributes.quests_id = quests.id
    WHERE
    quests_attributes.quests_id = $1`,
    [questId],
  );
  return result.rows.length ? result.rows : null;
};

// Assigns XP to attributes involved in a specific quest while completing it
export const assignXpToAttributesAndUserService = async (
  res: any,
  questId: number,
  questTotalXp: number,
  userId: number,
): Promise<void> => {
  // Get all user's attributes related to the quest to be completed
  const userAttrsToBeComQuest = await getAllAttributesToQuestService(questId);

  if (!userAttrsToBeComQuest) {
    return handleResponse(
      res,
      404,
      "User attributes linked to quest to be completed couldn't be found",
    );
  }

  // XP per attribute (even split)
  const xpForEachAttribute = Math.floor(
    questTotalXp / userAttrsToBeComQuest.length,
  );

  console.log("------ ATTRIBUTES FOR OF LOOP BEGIN ------");
  // For each attribute, apply XP and handle possible multi-level-ups
  for (const attr of userAttrsToBeComQuest) {
    console.log(`--- ATTRIBUTE ITERATION: ${attr.name.toUpperCase()} ---`);
    let remainingXpToDistributePerAttr = xpForEachAttribute;

    console.log(
      `remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}`,
    );
    // Defensive: ensure numbers are not null
    let level = attr.level ?? 1;
    let xp = attr.xp ?? 0;
    let xpToNext = attr.xp_to_next_level ?? calculateNextLevelThreshold(level);

    // Calculate total xp value to next level in current level
    let totalXpToNextLvl = xp + xpToNext;

    console.log(
      `level: ${level}, xp: ${xp}, xpToNext: ${xpToNext}, remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}, totalXpToNextLvl: ${totalXpToNextLvl}`,
    );

    // Add XP to the "total" XP counter
    xp += remainingXpToDistributePerAttr;
    console.log(`xp: ${xp}`);

    // While we still have XP to consume towards level-ups
    while (isLevelUpRequired(remainingXpToDistributePerAttr, xpToNext)) {
      console.log(
        `While loop data:
        remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}, xpToNext: ${xpToNext}`,
      );

      // Spend what is needed to level up
      remainingXpToDistributePerAttr -= xpToNext;
      console.log(`While loop data:
        remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}`);

      // Level up the attribute
      level += 1;
      console.log(`While loop data:
        level: ${level}`);

      xp -= totalXpToNextLvl;
      console.log(`While loop data:
        xp: ${xp}`);

      // Recalculate the total xp amount required for the NEW level
      xpToNext = calculateNextLevelThreshold(level);
      // (Here you could also accumulate some "leveledUp" count to later adjust user level)

      console.log(
        `While loop data:
        remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}, xpToNext: ${xpToNext}, xp: ${xp}`,
      );

      totalXpToNextLvl = xpToNext;
      console.log(`While loop data: 
        totalXpToNextLvl: ${totalXpToNextLvl}`);
    }

    // After all level-ups are processed, the remaining XP is what is still needed
    xpToNext -= remainingXpToDistributePerAttr;
    console.log(`xpToNext: ${xpToNext}`);

    console.log(
      `level: ${level}, xp: ${xp}, xpToNext: ${xpToNext}, attr.id: ${attr.id}`,
    );

    // 4) Persist the updated values to the database
    await pool.query(
      `UPDATE attributes
       SET level = $1,
           xp = $2,
           xp_to_next_level = $3
       WHERE id = $4`,
      [level, xp, xpToNext, attr.id],
    );
    console.log(`--- ATTRIBUTE ITERATION ${attr.name.toUpperCase()} END ---`);
  }

  console.log("------ ATTRIBUTES FOR OF LOOP END ------");

  // Get all user's attributes
  const userAttributes = await getAttributesByUserIdService(userId);

  // Initialize array which will contain each user attribute's level
  const userAttributesLvls: number[] = [];

  // Push each user attribute's level into the newly initialized array
  userAttributes?.forEach((attr: Attribute) =>
    userAttributesLvls.push(attr.level as number),
  );

  // Calculate new user level after quest was completed
  const newUserLvl = calculateUserLvl(userAttributesLvls);

  // Assign new user level to that specific user
  const userToLevelUp = await assignNewUserLvlService(userId, newUserLvl);
  console.log(`userToLevelUp: ${userToLevelUp}`);

  // If user to level up wasn't found then returns an error message
  if (!userToLevelUp)
    return handleResponse(res, 404, "User to level up could not be found");
  console.log(`newUserLvl: ${newUserLvl}`);
};
