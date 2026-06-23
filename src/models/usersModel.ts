import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";

// Importing types
import { type UserInDb, type UpdatedUser } from "../types/user.ts";

// --- GENERAL CRUD METHODS ---

export const getUserByIdModel = async (
  userId: string,
): Promise<UserInDb | null> => {
  const result = await pool.query<UserInDb>(
    "SELECT * FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0] ?? null;
};

export const getUserByEmailModel = async (
  email: string,
): Promise<UserInDb | null> => {
  const result = await pool.query<UserInDb>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0] ?? null;
};

/*
    RETURNING is a clause you can use after an
    INSERT/UPDATE/DELETE statement, to simply return the
    data from the previous query.
    For more details check https://www.postgresql.org/docs/current/dml-returning.html
*/
export const createNewUserModel = async (
  id: string,
  name: string,
  email: string,
  passwordHash: string,
): Promise<UserInDb | null> => {
  const result = await pool.query<UserInDb>(
    "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
    [id, name, email, passwordHash],
  );
  return result.rows[0] ?? null;
};

export const updateUserModel = async (
  id: string,
  updatedUserProps: UpdatedUser,
  isUserAction: boolean = false,
): Promise<UserInDb | null> => {
  const { query, values } = updateRow(
    "users",
    id,
    updatedUserProps, // Just pass the props directly
    "No parameters for user update were provided",
    isUserAction,
  );

  const result = await pool.query<UserInDb>(query, values);
  return result.rows[0] ?? null;
};

export const deleteUserModel = async (userId: string) => {
  const result = await pool.query<UserInDb>(
    "DELETE FROM users WHERE id = $1 RETURNING *",
    [userId],
  );
  return result.rows[0] ?? null;
};

// Soft-deletes a user
export const softDeleteUserModel = async (
  userId: string,
): Promise<UserInDb | null> => {
  const result = await pool.query<UserInDb>(
    "UPDATE users SET deleted_at = NOW() WHERE id = $1 RETURNING *",
    [userId],
  );
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Assigns new user's overall level
export const assignNewUserLvlModel = async (id: string, newUserLvl: number) => {
  const result = await pool.query<UserInDb>(
    `
    UPDATE users
    SET level=$2
    WHERE id=$1
    RETURNING *
    `,
    [id, newUserLvl],
  );
  return result.rows[0] ?? null;
};
