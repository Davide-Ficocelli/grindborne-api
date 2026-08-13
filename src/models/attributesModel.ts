import pool from "../config/db.js";
import updateRow from "../utils/updateRow.js";
import { INITIAL_XP_TO_NEXT_LEVEL } from "../config/globals.js";

// Importing types
import type {
  AttributeInDb,
  NewAttribute,
  UpdatedAttribute,
} from "../types/attribute.js";

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
  newAttributeObj: NewAttribute & { id: string }, // <-- Inject ID requirement
): Promise<AttributeInDb | null> => {
  const result = await pool.query<AttributeInDb>(
    "INSERT INTO attributes (id, name, description, icon, users_id, xp_to_next_level) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      newAttributeObj.id,
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
  id: string,
): Promise<AttributeInDb | null> => {
  const result = await pool.query<AttributeInDb>(
    "SELECT * FROM attributes WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
};

// Gets all attributes
export const getAllAttributesModel = async (): Promise<
  AttributeInDb[] | null
> => {
  const result = await pool.query<AttributeInDb>(`SELECT * FROM attributes`);
  return result.rows.length ? result.rows : null;
};

// Gets all user attributes by user id
export const getAttributesByUserIdModel = async (
  userId: string,
): Promise<AttributeInDb[] | null> => {
  const result = await pool.query<AttributeInDb>(
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

// Soft deletes a specific attribute by id
export const softDeleteAttributeModel = async (
  id: string,
): Promise<AttributeInDb | null> => {
  const result = await pool.query<AttributeInDb>(
    "UPDATE attributes SET deleted_at = NOW() WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// Updates a specific attribute by id
export const updateAttributeModel = async (
  id: string,
  updatedAttrProps: UpdatedAttribute,
  isUserAction: boolean = false,
): Promise<AttributeInDb | null> => {
  const { query, values } = updateRow(
    "attributes",
    id,
    {
      ...updatedAttrProps,
    },
    "No parameters for attribute update were provided",
    isUserAction,
  );

  const result = await pool.query<AttributeInDb>(query, values);
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestModel = async (
  questId: string,
): Promise<AttributeInDb[] | null> => {
  const result = await pool.query<AttributeInDb>(
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

// Assigns starting decay date to all attributes with xp
export const assignStartingDecayDateToAttributeModel = async (
  startingDecayDate: Date,
): Promise<AttributeInDb[] | null> => {
  const result = await pool.query<AttributeInDb>(
    "UPDATE attributes SET decay_date = $1 WHERE decay_date IS NULL AND xp > 0 RETURNING *",
    [startingDecayDate],
  );
  return result.rows.length ? result.rows : null;
};
