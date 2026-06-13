// Importing types
import type Attribute from "../types/attribute.ts";
import type { AttributeInDatabase } from "../types/attribute.ts";
import type ServiceValidation from "../types/serviceValidation.ts";

// Importing methods
import {
  createNewAttributeModel,
  getAttributesByUserIdModel,
  getAttributeByIdModel,
  deleteAttributeModel,
  updateAttributeModel,
  getAllAttributesToQuestModel,
  setAttributeLvlAndXpModel,
} from "../models/attributesModel.ts";
import { assignNewUserLvlService } from "../services/usersService.ts";
import { getUserByIdModel } from "../models/usersModel.ts";
import preventIdor from "../utils/preventIdor.ts";
import { calculateUserLvlHelper } from "../shared/usersHelpers.ts";

// Importing global variables
import {
  INITIAL_XP_TO_NEXT_LEVEL,
  NEW_ATTR_LEVEL_XP_COST_SCALING,
} from "../config/globals.ts";
import {
  calculateNextAttrLevelThreshold,
  calculateXpPerAttribute,
  calculateAttributeXpProgress,
  extractUserAttributesLvls,
} from "../shared/attributesHelpers.ts";

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
    return { ok: false, status: 404, message: "User attributes not found" };

  // Get attributes owner id
  const attributeOwnerId = allUserAttributes[0]?.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    attributeOwnerId as number,
  );

  if (
    isIdorDetected ||
    allUserAttributes.some((attr) => attr.users_id !== userId)
  )
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // return all user attirubutes
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

  // Delete the attribute
  const deletedAttribute = await deleteAttributeModel(attributeId);

  // Handle case in which deleted attribute is null
  if (!deletedAttribute)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while deleting attribute",
    };

  // If everything went well return a successful state
  return {
    ok: true,
    status: 200,
    message: "Attribute deleted successfully",
    data: deletedAttribute,
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

  // Update the attribute
  const updatedAttribute = await updateAttributeModel(
    attributeId,
    updatedAttrProps,
  );

  // Handle case in which updated attribute is null
  if (!updatedAttribute)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while updating the attribute",
    };

  // Update the attribute and return it
  return {
    ok: true,
    status: 200,
    message: "Attribute updated successfully",
    data: updatedAttribute,
  };
};

// ─────────────────────────────────────────────
// --- BUSINESS LOGIC SERVICE FUNCTIONS ---
// ─────────────────────────────────────────────

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestService = async (
  questId: number,
  userId: number,
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

// Assigns XP to attributes involved in a specific quest while completing it
export const assignXpToAttrsAndUserService = async (
  questId: number,
  questTotalXp: number,
  userId: number,
): Promise<ServiceValidation> => {
  // Get all user's attributes related to the quest to be completed
  const userAttrsToBeComQuest = await getAllAttributesToQuestModel(questId);

  if (!userAttrsToBeComQuest)
    return {
      ok: false,
      status: 404,
      message: "Attributes linked to quest to be completed not found",
    };

  // XP per attribute (evenly split)
  const xpForEachAttribute = calculateXpPerAttribute(
    questTotalXp,
    userAttrsToBeComQuest.length,
  );

  // For each attribute, apply XP and handle possible multi-level-ups
  for (const attr of userAttrsToBeComQuest) {
    const { level, xp, xpToNext } = calculateAttributeXpProgress(
      attr,
      xpForEachAttribute,
    );

    // 4) Persist the updated values to the database
    const updatedAttr = await setAttributeLvlAndXpModel(
      level,
      xp,
      xpToNext,
      attr.id,
    );

    if (!updatedAttr)
      return {
        ok: false,
        status: 500,
        message: "Something went wrong during attribute update",
      };
  }

  // Gets user attributes
  const userAttributes = await getAttributesByUserIdModel(userId);

  // Handle case where userAttributes is null
  if (!userAttributes)
    return {
      ok: false,
      status: 404,
      message: "User attributes couldn't be found",
    };

  // Initialize array which will contain each user attribute's level
  const userAttributesLvls = extractUserAttributesLvls(userAttributes);

  // Calculate new user level after quest was completed
  const newUserLvl = calculateUserLvlHelper(userAttributesLvls);

  // Get user to level up
  const userToLevelUp = await getUserByIdModel(userId);

  // If user to level up wasn't found then returns an error message
  if (!userToLevelUp)
    return {
      ok: false,
      status: 404,
      message: "User to level up not found",
    };

  // Assign new user level to that specific user
  const leveledUpUser = await assignNewUserLvlService(userId, newUserLvl);

  return {
    ok: true,
    status: 200,
    message: "Xp was distributed successfully",
    data: {
      user: leveledUpUser,
      attrsToComQuest: await getAllAttributesToQuestModel(questId),
    },
  };
};
