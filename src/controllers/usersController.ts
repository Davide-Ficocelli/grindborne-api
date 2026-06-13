import processServiceRequest from "../utils/processServiceRequest.ts";
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
  const { name, email, password } = req.body;
  return processServiceRequest(
    res,
    next,
    createNewUserService(name, email, password),
  );
};

export const getUserByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Get authenticated user and db user id
  const userId = Number(req.params.id);
  const authUserId = req.user.id;

  // Get user
  return processServiceRequest(
    res,
    next,
    getUserByIdService(userId, authUserId),
  );
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
  return processServiceRequest(
    res,
    next,
    updateUserService(userId, authUserid, {
      name,
      email,
      level,
      stamina,
    }),
  );
};

export const deleteUserController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Get authenticated and passed user id
  const userId = Number(req.params.id);
  const authUserid = req.user.id;

  return processServiceRequest(
    res,
    next,
    deleteUserService(userId, authUserid),
  );
};
