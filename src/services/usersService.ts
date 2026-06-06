// Importing types
import type ServiceValidation from "../types/serviceValidation.ts";
import type { UpdatedUser, UserInDb } from "../types/user.ts";

// Importing global variables
import { SALT_ROUNDS } from "../config/globals.ts";

// Importing functions
import preventIdor from "../utils/preventIdor.ts";
import bcrypt from "bcrypt";
import {
  createNewUserModel,
  getUserByIdModel,
  updateUserModel,
  deleteUserModel,
} from "../models/usersModel.ts";

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
  // Hash user password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Get new user
  const newUser = await createNewUserModel(name, email, passwordHash);

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
  userId: number,
  authUserId: number,
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
  userId: number,
  authUserId: number,
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
    userOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Update the user
  const updatedUser = await updateUserModel(userId, updatedUserProps);

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

// Deletes a specific user
export const deleteUserService = async (
  userId: number,
  authUserId: number,
): Promise<ServiceValidation> => {
  // Get the user to be deleted first
  const userToBeDeleted = await getUserByIdModel(userId);

  // Handle case in which the user to be deleted is null
  if (!userToBeDeleted)
    return {
      ok: false,
      status: 404,
      message: "User to be deleted not found",
    };

  // Get user owner id
  const userOwnerId = userToBeDeleted?.id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    authUserId,
    userOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Delete the user
  const deletedUser = await deleteUserModel(userId);

  // Handle case in which deleted user is null
  if (!deletedUser)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while deleting user",
    };

  // Prevent hashed password from being returned in response
  if (deletedUser.password_hash) delete deletedUser.password_hash;

  // If everything went well return a successful state
  return {
    ok: true,
    status: 200,
    message: "User deleted successfully",
    data: deletedUser,
  };
};
