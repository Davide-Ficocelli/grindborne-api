// Importing types
import type Attribute from "../types/attribute.ts";
import {
  createNewAttributeModel,
  getAttributesByUserIdModel,
  getAttributeByIdModel,
  deleteAttributeModel,
} from "../models/attributesModel.ts";
import handleResponse from "../utils/handleResponse.ts";
import preventIdor from "../utils/preventIdor.ts";

// File's index

/*
| --- PURE HELPER FUNCTIONS ---
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
  attributeObj: Attribute,
): Promise<Attribute | null> => {
  // Represents the initial value of xp for the new attribute to reach level 2
  const initialXpToNext = 100;
  return await createNewAttributeModel({
    initialXpToNext,
    attributeObj: attributeObj,
  });
};

// Gets all user attributes by user id
export const getAttributesByUserIdService = async (
  res: any,
  userId: number,
): Promise<Attribute[] | void> => {
  // Get all attributes by user id
  const allUserAttributes = await getAttributesByUserIdModel(userId);

  // Handle case in which user attributes are null
  if (!allUserAttributes)
    return handleResponse(res, 404, "User attributes weren't found");

  // Get attributes owner id
  const attributeOwnerId = allUserAttributes[0]?.users_id;

  // Prevent IDOR
  if (preventIdor(res, userId, attributeOwnerId as number).isIdorDetected)
    return;

  // return alll user attirubutes
  return allUserAttributes;
};

// Deletes a specific attribute
export const deleteAttributeService = async (
  res: any,
  userId: number,
  attributeId: number,
): Promise<void | Attribute | null> => {
  // Get the attribute to be deleted first
  const attributeToBeDeleted = await getAttributeByIdModel(attributeId);

  // Handle case in which the attribute to be deleted is null
  if (!attributeToBeDeleted)
    return handleResponse(res, 404, "Attribute to be deleted wasn't found");

  // Get attribute owner id
  const attributeOwnerId = attributeToBeDeleted?.users_id;

  // Prevent IDOR
  if (preventIdor(res, userId, attributeOwnerId as number).isIdorDetected)
    return;

  // Delete the attribute and return it
  return await deleteAttributeModel(attributeId);
};
