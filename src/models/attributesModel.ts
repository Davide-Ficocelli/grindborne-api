import pool from "../config/db.js";
import updateRow from "../utils/updateRow.js";

// Importing types
import type Attribute from "../types/attribute.ts";

// Inserts new attribute in the attributes table given the params from the request body and user's id from the JWT token
export const createNewAttributeService = async (
  name: string,
  description: string,
  icon: Buffer | null,
  userId: number,
): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "INSERT INTO attributes (name, description, icon, users_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, description, icon, userId],
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
    "SELECT attributes.id, attributes.name, attributes.description, attributes.level, attributes.icon FROM attributes JOIN users ON attributes.users_id = users.id WHERE attributes.users_id = $1;",
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
