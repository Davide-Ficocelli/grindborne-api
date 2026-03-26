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
