// Importing types
import type ServiceValidation from "../types/serviceValidation.js";
import type { UpdatedUser } from "../types/user.js";

// Importing global variables
import { SALT_ROUNDS } from "../config/globals.js";

// Importing functions
import { nanoid } from "nanoid";
import preventIdor from "../utils/preventIdor.js";
import bcrypt from "bcrypt";
import {
  createNewUserModel,
  getUserByIdModel,
  updateUserModel,
  assignNewUserLvlModel,
  softDeleteUserModel,
  getUserByEmailModel,
} from "../models/usersModel.js";

/*
|
| --- GENERAL CRUD SERVICE FUNCTIONS ---
|
| --- BUSINESS LOGIC SERVICE FUNCTIONS ---
|
*/

// ─────────────────────────────────────────────
// --- GENERAL CRUD SERVICE FUNCTIONS ---
// ─────────────────────────────────────────────

export const createNewUserService = async (
  name: string,
  email: string,
  password: string,
): Promise<ServiceValidation> => {
  // Look for an existing user by email
  const existingUser = await getUserByEmailModel(email);

  // If a user with that email is found, return an error
  if (existingUser)
    return {
      ok: false,
      status: 409,
      message: "Email is already taken",
    };

  // Generate nano id
  const id = nanoid();

  // Hash user password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Get new user
  const newUser = await createNewUserModel(id, name, email, passwordHash);

  // If user creation failed return an error state
  if (!newUser)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while creating new user",
    };

  // VERY IMPORTANT: DO NOT return the hashed password in the response
  if (newUser.password_hash) delete newUser.password_hash;

  // If everything was ok return a successfull state
  return {
    ok: true,
    status: 201,
    message: "New user created successfully",
    data: newUser,
  };
};

// Gets a user by id
export const getUserByIdService = async (
  userId: string,
  authUserId: string,
): Promise<ServiceValidation> => {
  // Get user by id
  const user = await getUserByIdModel(userId);

  // If user wasn't found return an error message
  if (!user) return { ok: false, status: 404, message: "User not found" };

  // Prevent IDOR
  const { isIdorDetected, status, message } = preventIdor(authUserId, user.id);

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Prevent hashed password from being returned in response
  if (user.password_hash) delete user.password_hash;

  // If everything went well then return a successfull response along with the data
  return {
    ok: true,
    status: 200,
    message: "User fetched successfully",
    data: user,
  };
};

// Updates a specific user
export const updateUserService = async (
  userId: string,
  authUserId: string,
  updatedUserProps: UpdatedUser,
): Promise<ServiceValidation> => {
  // Get the user to be updated first
  const userToBeUpdated = await getUserByIdModel(userId);

  // Handle case in which the user to be updated is null
  if (!userToBeUpdated)
    return {
      ok: false,
      status: 404,
      message: "User to be updated not found",
    };

  // Get user owner id
  const userOwnerId = userToBeUpdated.id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    authUserId,
    userOwnerId,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Update the user
  const updatedUser = await updateUserModel(userId, updatedUserProps, true);

  // Handle case in which updated user is null
  if (!updatedUser)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while updating the user",
    };

  // Prevent hashed password from being returned in response
  if (updatedUser.password_hash) delete updatedUser.password_hash;

  // If everything went well return a successful state
  return {
    ok: true,
    status: 200,
    message: "User updated successfully",
    data: updatedUser,
  };
};

// Soft-deletes user
export const softDeleteUserService = async (
  userId: string,
  authUserId: string,
): Promise<ServiceValidation> => {
  const userToBeDeleted = await getUserByIdModel(userId);

  if (!userToBeDeleted)
    return {
      ok: false,
      status: 404,
      message: "User to be soft-deleted not found",
    };

  const { isIdorDetected, status, message } = preventIdor(
    authUserId,
    userToBeDeleted.id,
  );
  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  const deletedUser = await softDeleteUserModel(userId);

  if (!deletedUser)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while soft-deleting user",
    };

  if (deletedUser.password_hash) delete deletedUser.password_hash;

  return {
    ok: true,
    status: 200,
    message: "User soft-deleted successfully",
    data: deletedUser,
  };
};

// Assigns new user's overall level
export const assignNewUserLvlService = async (
  userId: string,
  newUserLvl: number,
): Promise<ServiceValidation> => {
  // Get the user to be updated first
  const userToBeUpdated = await getUserByIdModel(userId);

  // Handle case in which the user to be updated is null
  if (!userToBeUpdated)
    return {
      ok: false,
      status: 404,
      message: "User to be updated not found",
    };

  // Get user owner id
  const userOwnerId = userToBeUpdated.id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(userId, userOwnerId);

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Update the user level
  const updatedUser = await assignNewUserLvlModel(userId, newUserLvl);

  // Handle case in which updated user is null
  if (!updatedUser)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while updating the user level",
    };

  // Prevent hashed password from being returned in response
  if (updatedUser.password_hash) delete updatedUser.password_hash;

  // If everything went well return a successful state
  return {
    ok: true,
    status: 200,
    message: "User level updated successfully",
    data: updatedUser,
  };
};
