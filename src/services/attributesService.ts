// Importing types
import type { NewAttribute, UpdatedAttribute } from "../types/attribute.ts";
import type ServiceValidation from "../types/serviceValidation.ts";

// Importing functions
import { nanoid } from "nanoid";
import {
  createNewAttributeModel,
  getAttributesByUserIdModel,
  getAttributeByIdModel,
  updateAttributeModel,
  getAllAttributesToQuestModel,
  setAttributeLvlAndXpModel,
  softDeleteAttributeModel,
  getAllAttributesModel,
} from "../models/attributesModel.ts";
import { assignNewUserLvlService } from "../services/usersService.ts";
import { getUserByIdModel } from "../models/usersModel.ts";
import preventIdor from "../utils/preventIdor.ts";
import { calculateUserLvlHelper } from "../shared/usersHelpers.ts";
import {
  getAllUserAttrLvls,
  decayAttribute,
} from "../shared/attributesHelpers.ts";
import toUTCDate from "../utils/toUTCDate.ts";

// Importing global variables
import {
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
  newAttrObj: NewAttribute,
): Promise<ServiceValidation> => {
  // Generate nano id
  const id = nanoid();

  // Get new attribute
  const newAttribute = await createNewAttributeModel({ id, ...newAttrObj });

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
  userId: string,
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
    attributeOwnerId as string,
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

// Soft-deletes an attribute
export const softDeleteAttributeService = async (
  userId: string,
  attributeId: string,
): Promise<ServiceValidation> => {
  const attributeToBeDeleted = await getAttributeByIdModel(attributeId);

  if (!attributeToBeDeleted)
    return {
      ok: false,
      status: 404,
      message: "Attribute to be soft-deleted wasn't found",
    };

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    attributeToBeDeleted.users_id as string,
  );
  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  const deletedAttribute = await softDeleteAttributeModel(attributeId);

  if (!deletedAttribute)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while soft-deleting attribute",
    };

  return {
    ok: true,
    status: 200,
    message: "Attribute soft-deleted successfully",
    data: deletedAttribute,
  };
};

// Updates a specific attribute by id
export const updateAttributeService = async (
  userId: string,
  attributeId: string,
  updatedAttrProps: UpdatedAttribute,
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
    attributeOwnerId as string,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Update the attribute
  const updatedAttribute = await updateAttributeModel(
    attributeId,
    updatedAttrProps,
    true,
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
  questId: string,
  userId: string,
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
    attributeOwnerId as string,
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
  questId: string,
  questTotalXp: number,
  userId: string,
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
      attributesToCompletedQuest: await getAllAttributesToQuestModel(questId),
    },
  };
};

// Decays an attribute
export const decayAttributesService = async (): Promise<ServiceValidation> => {
  // Get all attributes
  const allAttributes = await getAllAttributesModel();

  // Handle case in which attributes is null
  if (!allAttributes || allAttributes.length === 0)
    return { ok: false, status: 404, message: "No attributes found" };

  // Get all user attibutes levels
  const allUserAttrLvls = getAllUserAttrLvls(allAttributes);

  if (!allUserAttrLvls)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong",
    };

  const today = toUTCDate(new Date());

  // Check for attribute decay eligibility
  for (const attribute of allAttributes) {
    // If attribute isn't eligible for decay then skip directly to the next one
    if (
      !attribute.decay_date ||
      attribute.decay_date.getTime() > today.getTime()
    )
      continue;

    decayAttribute(attribute, allUserAttrLvls);
  }

  return { ok: true, status: 200, message: "Attribute decay complete." };
};
