import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";

// Importing types
import type User from "../types/user.ts";

// --- GENERAL CRUD METHODS ---

export const getAllUsersService = async (): Promise<User[] | null> => {
  const result = await pool.query<User>("SELECT * FROM users");
  return result.rows ?? null;
};

export const getUserByIdService = async (id: number): Promise<User | null> => {
  const result = await pool.query<User>("SELECT * FROM users WHERE id = $1", [
    id,
  ]);
  return result.rows[0] ?? null;
};

export const getUserByEmailService = async (
  email: string,
): Promise<User | null> => {
  const result = await pool.query<User>(
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
export const createUserService = async (
  name: string,
  email: string,
  password: string,
): Promise<User | null> => {
  const result = await pool.query<User>(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
    [name, email, password],
  );
  return result.rows[0] ?? null;
};

export const updateUserService = async (
  id: number,
  name: string,
  email: string,
  level: number,
  stamina: number,
): Promise<User | null> => {
  const { query, values } = updateRow(
    "users",
    id,
    {
      name,
      email,
      level,
      stamina,
    },
    "No parameters for user update were provided",
  );

  const result = await pool.query<User>(query, values);
  return result.rows[0] ?? null;
};

export const deleteUserService = async (id: number) => {
  const result = await pool.query<User>(
    "DELETE FROM users WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Assigns new user's overall level
export const assignNewUserLvlService = async (
  id: number,
  newUserLvl: number,
) => {
  const result = await pool.query<User>(
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
