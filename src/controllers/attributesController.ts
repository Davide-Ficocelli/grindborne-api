import {
  createNewAttributeService,
  getAttributesByUserIdService,
  deleteAttributeService,
  updateAttributeService,
  getAllAttributesToQuestService,
} from "../services/attributesService.ts";
import handleResponse from "../utils/handleResponse.ts";

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
  try {
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
    const newAttribute = await createNewAttributeService(newAttrDataObj);

    // Get and return service results
    const { ok, status, message, data } = newAttribute;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Returns all of the corrispective user's attributes
export const getAttributesByUserIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Gets user id
    const userId: number = req.user.id;

    // Retrieves and saves all user's attributes
    const userAttributes = await getAttributesByUserIdService(userId);

    // Get and return service results
    const { ok, status, message, data } = userAttributes;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Deletes an attribute
export const deleteAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Gets user id
    const userId: number = req.user.id;

    // Get deleted attribute
    const deletedAttribute = await deleteAttributeService(
      userId,
      Number(req.params.id),
    );

    // Get and return service results
    const { ok, status, message, data } = deletedAttribute;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Updates an attribute
export const updateAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description, icon } = req.body;
    // Gets user id
    const userId: number = req.user.id;

    // Get updated attribute
    const updatedAttribute = await updateAttributeService(
      userId,
      Number(req.params.id),
      { name, description, icon },
    );

    // Get and return service results
    const { ok, status, message, data } = updatedAttribute;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Gets user and quest id
    const userId: number = req.user.id;
    const questId: number = Number(req.params.questId);

    // Get all attributes to quest
    const allAttrsToQuest = await getAllAttributesToQuestService(
      questId,
      userId,
    );

    // Get and return service results
    const { ok, status, message, data } = allAttrsToQuest;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};
