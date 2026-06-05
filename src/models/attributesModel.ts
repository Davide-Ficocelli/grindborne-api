import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";
import { calculateUserLvl, assignNewUserLvlService } from "./usersModel.ts";
import {
  STARTING_GRACE_PERIOD_IN_DAYS,
  NEW_ATTR_LEVEL_XP_COST_SCALING,
  DECAY_BASE_PERCENT,
  INITIAL_XP_TO_NEXT_LEVEL,
} from "../config/globals.ts";
import { overallAttributesMultiplier } from "../services/questsService.ts";

// Importing types
import type Attribute from "../types/attribute.ts";
import type {
  AttributeInDatabase,
  AttributesLvlsPerUser,
} from "../types/attribute.ts";
import handleResponse from "../utils/handleResponse.ts";
import { Query } from "pg";

// File's index

/*
|
| --- GENERAL CRUD MODEL FUNCTIONS ---
|
| --- BUSINESS LOGIC MODEL FUNCTIONS ---
|
*/

// --- GENERAL CRUD MODEL FUNCTIONS ---

// Inserts new attribute in the attributes table given the params from the request body and user's id from the JWT token
export const createNewAttributeModel = async (
  newAttributeObj: Attribute,
): Promise<AttributeInDatabase | null> => {
  const result = await pool.query<AttributeInDatabase>(
    "INSERT INTO attributes (name, description, icon, users_id, xp_to_next_level) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      newAttributeObj.name,
      newAttributeObj.description,
      newAttributeObj.icon,
      newAttributeObj.users_id,
      INITIAL_XP_TO_NEXT_LEVEL,
    ],
  );
  return result.rows[0] ?? null;
};

// Gets a specific attribute by its id
export const getAttributeByIdModel = async (
  id: number,
): Promise<AttributeInDatabase | null> => {
  const result = await pool.query<AttributeInDatabase>(
    "SELECT * FROM attributes WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
};

// Gets all attributes
export const getAllAttributesModel = async (): Promise<
  AttributeInDatabase[] | null
> => {
  const result = await pool.query<AttributeInDatabase>(
    `SELECT * FROM attributes`,
  );
  return result.rows.length ? result.rows : null;
};

// Gets all user attributes by user id
export const getAttributesByUserIdModel = async (
  userId: number,
): Promise<AttributeInDatabase[] | null> => {
  const result = await pool.query<AttributeInDatabase>(
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
export const deleteAttributeModel = async (
  id: number,
): Promise<AttributeInDatabase | null> => {
  const result = await pool.query<AttributeInDatabase>(
    "DELETE FROM attributes WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// Updates a specific attribute by id
export const updateAttributeModel = async (
  id: number,
  updatedAttrProps: { name: string; description?: string; icon?: Buffer },
): Promise<Attribute | null> => {
  const { query, values } = updateRow(
    "attributes",
    id,
    {
      ...updatedAttrProps,
    },
    "No parameters for attribute update were provided",
  );

  const result = await pool.query<AttributeInDatabase>(query, values);
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestModel = async (
  questId: number,
): Promise<AttributeInDatabase[] | null> => {
  const result = await pool.query<AttributeInDatabase>(
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

/*
  Sets the new level and xp values of a specific attribute

  This function is used in the attributes service to update all attributes involved in a specific quest
  upon quest completion and total xp rewards calculation for that quest
*/
export const setAttributeLvlAndXpModel = async (
  level: number,
  xp: number,
  xpToNextLvl: number,
  attributeId: number,
): Promise<Attribute | null> => {
  const { query, values } = updateRow(
    "attributes",
    attributeId,
    { level, xp, xp_to_next_level: xpToNextLvl },
    "Something went wrong during attribute update",
  );

  const result = await pool.query<Attribute>(query, values);
  return result.rows[0] ?? null;
};
