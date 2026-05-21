import { updateAttributeService } from "../models/attributesModel.ts";
import {
  createNewAttributeService,
  getAttributesByUserIdService,
  deleteAttributeService,
} from "../services/attributesService.ts";
import handleResponse from "../utils/handleResponse.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/auth.ts";
import type Attribute from "../types/attribute.ts";

export const createNewAttributeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Gets the input fields which will be inserted in the attributes table for the new record from the request body
    const { name, description, icon } = req.body;

    // Gets user's id for attributes_id field
    const users_id = req.user.id;

    // Let's create the object compliant with the NewAttribute interface
    const attributeData: Attribute = {
      status: "new", // TypeScript is now happy because NewAttribute requires it
      name,
      description,
      icon,
      users_id,
    };

    // Starts the attribute creation process with the appropriate async function created in the attributesService.ts file
    const newAttribute = await createNewAttributeService(attributeData);

    if (!newAttribute)
      return handleResponse(
        res,
        500,
        "Something went wrong while creating new attribute",
      );

    // Sends back a successfull response, status code and message if the new attribute is created with no issues
    handleResponse(res, 201, "Attribute created successfully", newAttribute);
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
    const userId = req.user.id;

    // Retrieves and saves all user's attributes
    const userAttributes = await getAttributesByUserIdService(res, userId);

    // If no attributes are returned send back an error message
    if (!userAttributes)
      return handleResponse(res, 404, "No attributes were found for this user");

    // Return attributes if no issues occured
    handleResponse(
      res,
      200,
      "All user attributes successfully retrieved",
      userAttributes,
    );
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
    const userId = req.user.id;

    const deletedAttribute = await deleteAttributeService(
      res,
      userId,
      Number(req.params.id),
    );
    if (!deletedAttribute)
      return handleResponse(res, 404, "Deleted attribute not found");
    handleResponse(
      res,
      200,
      "Attribute deleted successfully",
      deletedAttribute,
    );
  } catch (err) {
    next(err);
  }
};

// Updates an attribute
export const updateAttribute = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description, level, xp } = req.body;
    const updatedAttribute = await updateAttributeService(
      Number(req.params.id),
      name,
      description,
      level,
      xp,
    );
    if (!updatedAttribute)
      return handleResponse(res, 404, "Attribute not found");
    handleResponse(
      res,
      200,
      "Attribute updated successfully",
      updatedAttribute,
    );
  } catch (err) {
    next(err);
  }
};
