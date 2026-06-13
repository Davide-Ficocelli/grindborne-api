import {
  createNewAttributeService,
  getAttributesByUserIdService,
  deleteAttributeService,
  updateAttributeService,
  getAllAttributesToQuestService,
} from "../services/attributesService.ts";
import processServiceRequest from "../utils/processServiceRequest.ts";

// Importing types
import { type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/auth.ts";
import type Attribute from "../types/attribute.ts";

// Creates a new attribute with user's inputs
export const createNewAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Gets the input fields which will be inserted in the attributes table for the new record from the request body
  const { name, description, icon } = req.body;

  // Gets user's id for attributes_id field
  const users_id: number = req.user.id;

  // Let's create the object compliant with the NewAttribute interface
  const newAttrDataObj: Attribute = {
    status: "new", // TypeScript is now happy because NewAttribute requires it
    name,
    description,
    icon,
    users_id,
  };

  // Starts the attribute creation process with the appropriate async function created in the attributesService.ts file
  return processServiceRequest(
    res,
    next,
    createNewAttributeService(newAttrDataObj),
  );
};

// Returns all of the corrispective user's attributes
export const getAttributesByUserIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Gets user id
  const userId: number = req.user.id;

  // Retrieves and saves all user's attributes
  return processServiceRequest(res, next, getAttributesByUserIdService(userId));
};

// Deletes an attribute
export const deleteAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Gets user id
  const userId: number = req.user.id;

  // Get deleted attribute
  return processServiceRequest(
    res,
    next,
    deleteAttributeService(userId, Number(req.params.id)),
  );
};

// Updates an attribute
export const updateAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { name, description, icon } = req.body;
  // Gets user id
  const userId: number = req.user.id;

  // Get updated attribute
  return processServiceRequest(
    res,
    next,
    updateAttributeService(userId, Number(req.params.id), {
      name,
      description,
      icon,
    }),
  );
};

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Gets user and quest id
  const userId: number = req.user.id;
  const questId: number = Number(req.params.questId);

  // Get all attributes to quest
  return processServiceRequest(
    res,
    next,
    getAllAttributesToQuestService(questId, userId),
  );
};
