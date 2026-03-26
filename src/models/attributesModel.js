import pool from "../config/db.js";

export const createAttributeService = async (name, description, icon) => {
  const result = await pool.query(
    "INSERT INTO attributes (name, description, icon) VALUES ($1, $2, $3) RETURNING *",
    [name, description, icon],
  );
  return result.rows[0];
};
