// Importing types
import type Attribute from "../types/attribute.ts";
import type ServiceValidation from "../types/serviceValidation.ts";

import {
  createNewAttributeModel,
  getAttributesByUserIdModel,
  getAttributeByIdModel,
  deleteAttributeModel,
  updateAttributeModel,
  getAllAttributesToQuestModel,
} from "../models/attributesModel.ts";
import handleResponse from "../utils/handleResponse.ts";
import preventIdor from "../utils/preventIdor.ts";

// File's index

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

// Inserts new attribute in the attributes table given the params from the request body and user's id from the JWT token
export const createNewAttributeService = async (
  newAttrObj: Attribute,
): Promise<ServiceValidation> => {
  // Get new attribute
  const newAttribute = await createNewAttributeModel(newAttrObj);

  if (!newAttribute)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while creating new attribute",
    };

  return {
    ok: true,
    status: 201,
    message: "Attribute created successfully",
    data: newAttribute,
  };
};

// Gets all user attributes by user id
export const getAttributesByUserIdService = async (
  userId: number,
): Promise<ServiceValidation> => {
  // Get all attributes by user id
  const allUserAttributes = await getAttributesByUserIdModel(userId);

  // Handle case in which user attributes are null
  if (!allUserAttributes)
    return { ok: false, status: 404, message: "User attributes weren't found" };

  // Get attributes owner id
  const attributeOwnerId = allUserAttributes[0]?.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    attributeOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // return alll user attirubutes
  return {
    ok: true,
    status: 200,
    message: "All user attributes successfully retrieved",
    data: allUserAttributes,
  };
};

// Deletes a specific attribute
export const deleteAttributeService = async (
  userId: number,
  attributeId: number,
): Promise<ServiceValidation> => {
  // Get the attribute to be deleted first
  const attributeToBeDeleted = await getAttributeByIdModel(attributeId);

  // Handle case in which the attribute to be deleted is null
  if (!attributeToBeDeleted)
    return {
      ok: false,
      status: 404,
      message: "Attribute to be deleted wasn't found",
    };

  // Get attribute owner id
  const attributeOwnerId = attributeToBeDeleted?.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    attributeOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Delete the attribute and return it
  return {
    ok: true,
    status: 200,
    message: "Attribute deleted successfully",
    data: await deleteAttributeModel(attributeId),
  };
};

// Updates a specific attribute by id
export const updateAttributeService = async (
  userId: number,
  attributeId: number,
  updatedAttrProps: {
    name: string;
    description?: string;
    icon?: Buffer;
  },
): Promise<ServiceValidation> => {
  // Get the attribute to be updated first
  const attributeToBeUpdated = await getAttributeByIdModel(attributeId);

  // Handle case in which the attribute to be updated is null
  if (!attributeToBeUpdated)
    return {
      ok: false,
      status: 404,
      message: "Attribute to be updated wasn't found",
    };

  // Get attribute owner id
  const attributeOwnerId = attributeToBeUpdated?.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    attributeOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Update the attribute and return it
  return {
    ok: true,
    status: 200,
    message: "Attribute updated successfully",
    data: await updateAttributeModel(attributeId, updatedAttrProps),
  };
};

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestService = async (
  userId: number,
  questId: number,
): Promise<ServiceValidation> => {
  // Get all attributes by user id
  const allAttrsToQuest = await getAllAttributesToQuestModel(questId);

  // Handle case in which attributes to quest are null
  if (!allAttrsToQuest)
    return {
      ok: false,
      status: 404,
      message: "Quest attributes weren't found",
    };

  // Get attributes owner id
  const attributeOwnerId = allAttrsToQuest[0]?.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    attributeOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // return all attributes to quest
  return {
    ok: true,
    status: 200,
    message: "All attributes to quest were fetched successfully",
    data: allAttrsToQuest,
  };
};
