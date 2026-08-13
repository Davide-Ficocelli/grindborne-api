import pool from "../config/db.js";

export const addRefreshTokenModel = async (
  token: string,
  userId: string,
): Promise<void> => {
  await pool.query(
    "INSERT INTO refresh_tokens (token, users_id) VALUES ($1, $2)",
    [token, userId],
  );
};

export const getRefreshTokenModel = async (token: string): Promise<boolean> => {
  const result = await pool.query(
    "SELECT token FROM refresh_tokens WHERE token = $1",
    [token],
  );
  return result.rows.length > 0;
};

export const deleteRefreshTokenModel = async (token: string): Promise<void> => {
  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
};
