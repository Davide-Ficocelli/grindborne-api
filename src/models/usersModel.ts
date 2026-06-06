import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";

// Importing types
import { type UserInDb, type UpdatedUser } from "../types/user.ts";

// --- GENERAL CRUD METHODS ---

export const getUserByIdModel = async (
  userId: number,
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
  name: string,
  email: string,
  passwordHash: string,
): Promise<UserInDb | null> => {
  const result = await pool.query<UserInDb>(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
    [name, email, passwordHash],
  );
  return result.rows[0] ?? null;
};

export const updateUserModel = async (
  id: number,
  updatedUserProps: UpdatedUser,
): Promise<UserInDb | null> => {
  const { query, values } = updateRow(
    "users",
    id,
    {
      ...updatedUserProps,
    },
    "No parameters for user update were provided",
  );

  const result = await pool.query<UserInDb>(query, values);
  return result.rows[0] ?? null;
};

export const deleteUserModel = async (userId: number) => {
  const result = await pool.query<UserInDb>(
    "DELETE FROM users WHERE id = $1 RETURNING *",
    [userId],
  );
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Assigns new user's overall level
export const assignNewUserLvlService = async (
  id: number,
  newUserLvl: number,
) => {
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

// Calculate user's level
export const calculateUserLvl = function (
  userAttributesLvls: number[],
): number {
  // Perform the calculation to get user level
  // Sum all of the levels

  const attributesLvlTotal = userAttributesLvls.reduce(
    (sum, lvl) => sum + lvl,
    0,
  );
  console.log(`attributesLvlTotal: ${attributesLvlTotal}`);

  // Subtract to the total the number of the attributes minus 1
  const userLevel = attributesLvlTotal - (userAttributesLvls.length - 1);

  return userLevel;
};
