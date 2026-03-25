import pool from "../config/db.js";

export const createAttributeService = async (
  users_id,
  name,
  description,
  icon,
) => {
  const result = await pool.query(
    "INSERT INTO attributes (users_id, name, description, icon) VALUES ($1, $2, $3, $4) RETURNING *",
    [users_id, name, description, icon],
  );
  return result.rows[0];
};
