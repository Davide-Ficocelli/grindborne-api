import bcrypt from "bcrypt";
import handleResponse from "../utils/handleResponse.ts";
import {
  createUserService,
  deleteUserService,
  getAllUsersService,
  getUserByIdService,
  updateUserService,
} from "../models/usersModel.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    const saltRounds = 10;

    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await createUserService(name, email, passwordHash);
    handleResponse(res, 201, "User created successfully", newUser);

    // VERY IMPORTANT: DO NOT return the hashed password in the response
    if (newUser && (newUser as any).password_hash) {
      delete (newUser as any).password_hash;
    }
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await getAllUsersService();
    handleResponse(res, 200, "Users fetched successfully", users as any);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getUserByIdService(Number(req.params.id));
    if (!user) return handleResponse(res, 404, "User not found");
    handleResponse(res, 200, "User fetched successfully", user);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, level, stamina } = req.body;
  try {
    const updatedUser = await updateUserService(
      Number(req.params.id),
      name,
      email,
      level,
      stamina,
    );
    if (!updatedUser) return handleResponse(res, 404, "User not found");
    handleResponse(res, 200, "User updated successfully", updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const deletedUser = await deleteUserService(Number(req.params.id));
    if (!deletedUser) return handleResponse(res, 404, "User not found");
    handleResponse(res, 200, "User deleted successfully", deletedUser);
  } catch (err) {
    next(err);
  }
};
