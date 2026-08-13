import {
  createNewAttributeService,
  getAttributesByUserIdService,
  updateAttributeService,
  getAllAttributesToQuestService,
  softDeleteAttributeService,
} from "../services/attributesService.js";
import processServiceRequest from "../utils/processServiceRequest.js";

// Importing types
import { type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/auth.js";
import type { NewAttribute } from "../types/attribute.js";

// Creates a new attribute with user's inputs
export const createNewAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Gets the input fields which will be inserted in the attributes table for the new record from the request body
  const { name, description, icon } = req.body;

  // Gets user's id for attributes_id field
  const users_id: string = req.user.id;

  // Let's create the object compliant with the NewAttribute interface
  const newAttrDataObj: NewAttribute = {
    name,
    description,
    icon,
    users_id,
  };

  // Starts the attribute creation process with the appropriate async function created in the attributesService.js file
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
  const userId: string = req.user.id;

  // Retrieves and saves all user's attributes
  return processServiceRequest(res, next, getAttributesByUserIdService(userId));
};

// Soft-deletes an attribute
export const softDeleteAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user.id;
  const attributeId = req.params.id ? req.params.id.toString() : "";

  return processServiceRequest(
    res,
    next,
    softDeleteAttributeService(userId, attributeId),
  );
};

// Updates an attribute
export const updateAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { name, description, icon } = req.body;
  // Gets user and attribute id
  const userId: string = req.user.id;
  const attributeId: string = req.params.id ? req.params.id.toString() : "";

  // Get updated attribute
  return processServiceRequest(
    res,
    next,
    updateAttributeService(userId, attributeId, {
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
  const userId: string = req.user.id;
  const questId: string = req.params.questId
    ? req.params.questId.toString()
    : "";

  // Get all attributes to quest
  return processServiceRequest(
    res,
    next,
    getAllAttributesToQuestService(questId, userId),
  );
};
