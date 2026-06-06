import handleResponse from "../utils/handleResponse.ts";
import {
  createNewUserService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
} from "../services/usersService.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/auth.ts";

export const createNewUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body;

    const newUser = await createNewUserService(name, email, password);

    // Get and return service results
    const { ok, status, message, data } = newUser;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

export const getUserByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get authenticated user and db user id
    const userId = Number(req.params.id);
    const authUserId = req.user.id;

    // Get user
    const quest = await getUserByIdService(userId, authUserId);

    // Get and return service validation results
    const { ok, status, message, data } = quest;

    // return response validation results
    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

export const updateUserController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, level, stamina } = req.body;

  // Get authenticated and passed user id
  const userId = Number(req.params.id);
  const authUserid = req.user.id;
  try {
    const updatedUser = await updateUserService(userId, authUserid, {
      name,
      email,
      level,
      stamina,
    });

    // Get and return service results
    const { ok, status, message, data } = updatedUser;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get authenticated and passed user id
    const userId = Number(req.params.id);
    const authUserid = req.user.id;

    const deletedUser = await deleteUserService(userId, authUserid);

    // Get and return service results
    const { ok, status, message, data } = deletedUser;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};
