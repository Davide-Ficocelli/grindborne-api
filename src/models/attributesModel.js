import pool from "../config/db.js";

// Inserts new attribute in the attributes table given the params from the request body and user's id from the JWT token
export const createNewAttributeService = async (
  name,
  description,
  icon,
  userId,
) => {
  const result = await pool.query(
    "INSERT INTO attributes (name, description, icon, users_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, description, icon, userId],
  );
  return result.rows[0];
};

// Gets a specific attribute by its id
export const getAttributeByIdService = async (id) => {
  const result = await pool.query("SELECT * FROM attributes WHERE id = $1", [
    id,
  ]);
  return result.rows[0];
};

// Gets all user attributes by user id
export const getAttributesByUserIdService = async (userId) => {
  const result = await pool.query(
    "SELECT attributes.id, attributes.name, attributes.description, attributes.level, attributes.icon FROM attributes JOIN users ON attributes.users_id = users.id WHERE attributes.users_id = $1;",
    [userId],
  );
  return result.rows;
};

// Deletes a specific attribute by id
export const deleteAttributeService = async (id) => {
  const result = await pool.query(
    "DELETE FROM attributes WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
};

// Updates a specific attribute by id
export const updateAttributeService = async (
  id,
  name,
  description,
  level,
  xp,
) => {
  // 1. Collect fields in an object
  const updates = { name, description, level, xp };

  const setClauses = [];
  const values = [id]; // $1 is ALWAYS id
  let paramIndex = 2; // from second position on for updateable fields

  // 2. Dynamically build SET and values
  for (const [keyName, keyValue] of Object.entries(updates)) {
    // Object.entries() returns a map [["name", "Strength"], ["description", "Lifting capacity"]]
    if (keyValue === undefined) continue; // skip fields not present

    setClauses.push(`${keyName} = $${paramIndex}`);
    values.push(keyValue);
    paramIndex++;
  }

  // 3. If there are no fields to update, throw error
  if (setClauses.length === 0) {
    throw new Error("No parameters for attribute update were provided");
  }

  // 4. Mount the final query
  const query = `
    UPDATE attributes
    SET ${setClauses.join(", ")}
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};
