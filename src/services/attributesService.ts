// Importing types
import type Attribute from "../types/attribute.ts";
import type {
  AttributeInDatabase,
  AttributesLvlsPerUser,
} from "../types/attribute.ts";
import type ServiceValidation from "../types/serviceValidation.ts";

// Importing methods
import {
  createNewAttributeModel,
  getAllAttributesModel,
  getAttributesByUserIdModel,
  getAttributeByIdModel,
  deleteAttributeModel,
  updateAttributeModel,
  getAllAttributesToQuestModel,
  setAttributeLvlAndXpModel,
} from "../models/attributesModel.ts";
import {
  calculateUserLvl,
  assignNewUserLvlService,
  getUserByIdService,
} from "../models/usersModel.ts";
import { overallAttributesMultiplier } from "../services/questsService.ts";
import preventIdor from "../utils/preventIdor.ts";

// Importing global variables
import {
  INITIAL_XP_TO_NEXT_LEVEL,
  NEW_ATTR_LEVEL_XP_COST_SCALING,
  STARTING_GRACE_PERIOD_IN_DAYS,
  DECAY_BASE_PERCENT,
} from "../config/globals.ts";

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

// ─────────────────────────────────────────────
// --- BUSINESS LOGIC SERVICE FUNCTIONS ---
// ─────────────────────────────────────────────

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

// --- Helper functions for assignXpToAttributesAndUserService ---

// Calculates how much XP is needed to go from current level to next level for an ATTRIBUTE
export function calculateNextLevelThresholdModel(level: number): number {
  const base = INITIAL_XP_TO_NEXT_LEVEL; // XP needed to go from level 1 to 2
  const scale = NEW_ATTR_LEVEL_XP_COST_SCALING; // each new level increases the requirement by 20%

  // level 1 -> 100
  // level 2 -> 120
  // level 3 -> 140
  const cost = base * (1 + (level - 1) * scale);
  return Math.round(cost);
}

// Determines whether a new level up is required
const isLevelUpRequired = (
  remainingXpToDistribute: number,
  xpToNext: number,
): boolean => remainingXpToDistribute >= xpToNext;

// Assigns XP to attributes involved in a specific quest while completing it
export const assignXpToAttributesAndUserService = async (
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
      message: "Attributes linked to quest to be completed couldn't be found",
    };

  // XP per attribute (evenly split)
  const xpForEachAttribute = Math.floor(
    questTotalXp / userAttrsToBeComQuest.length,
  );

  console.log("------ ATTRIBUTES FOR OF LOOP BEGIN ------");
  // For each attribute, apply XP and handle possible multi-level-ups
  for (const attr of userAttrsToBeComQuest) {
    console.log(`--- ATTRIBUTE ITERATION: ${attr.name.toUpperCase()} ---`);
    let remainingXpToDistributePerAttr = xpForEachAttribute;

    console.log(
      `remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}`,
    );
    // Defensive: ensure numbers are not null
    let level = attr.level ?? 1;
    let xp = attr.xp ?? 0;
    let xpToNext =
      attr.xp_to_next_level ?? calculateNextLevelThresholdModel(level);

    // Calculate total xp value to next level in current level
    let totalXpToNextLvl = xp + xpToNext;

    console.log(
      `level: ${level}, xp: ${xp}, xpToNext: ${xpToNext}, remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}, totalXpToNextLvl: ${totalXpToNextLvl}`,
    );

    // Add XP to the "total" XP counter
    xp += remainingXpToDistributePerAttr;
    console.log(`xp: ${xp}`);

    // While we still have XP to consume towards level-ups
    while (isLevelUpRequired(remainingXpToDistributePerAttr, xpToNext)) {
      console.log(
        `While loop data:
        remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}, xpToNext: ${xpToNext}`,
      );

      // Spend what is needed to level up
      remainingXpToDistributePerAttr -= xpToNext;
      console.log(`While loop data:
        remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}`);

      // Level up the attribute
      level += 1;
      console.log(`While loop data:
        level: ${level}`);

      xp -= totalXpToNextLvl;
      console.log(`While loop data:
        xp: ${xp}`);

      // Recalculate the total xp amount required for the NEW level
      xpToNext = calculateNextLevelThresholdModel(level);
      // (Here you could also accumulate some "leveledUp" count to later adjust user level)

      console.log(
        `While loop data:
        remainingXpToDistributePerAttr: ${remainingXpToDistributePerAttr}, xpToNext: ${xpToNext}, xp: ${xp}`,
      );

      totalXpToNextLvl = xpToNext;
      console.log(`While loop data: 
        totalXpToNextLvl: ${totalXpToNextLvl}`);
    }

    // After all level-ups are processed, the remaining XP is what is still needed
    xpToNext -= remainingXpToDistributePerAttr;
    console.log(`xpToNext: ${xpToNext}`);

    console.log(
      `level: ${level}, xp: ${xp}, xpToNext: ${xpToNext}, attr.id: ${attr.id}`,
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

    console.log(`--- ATTRIBUTE ITERATION ${attr.name.toUpperCase()} END ---`);
  }

  console.log("------ ATTRIBUTES FOR OF LOOP END ------");

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
  const userAttributesLvls: number[] = [];

  // Push each user attribute's level into the newly initialized array
  userAttributes.forEach((attr: AttributeInDatabase) =>
    userAttributesLvls.push(attr.level as number),
  );

  // Calculate new user level after quest was completed
  const newUserLvl = calculateUserLvl(userAttributesLvls);

  const userToLevelUp = await getUserByIdService(userId);

  // If user to level up wasn't found then returns an error message
  if (!userToLevelUp)
    return {
      ok: false,
      status: 404,
      message: "User to level up could not be found",
    };
  console.log(`userToLevelUp: ${userToLevelUp}`);

  // Assign new user level to that specific user
  const leveledUpUser = await assignNewUserLvlService(userId, newUserLvl);
  console.log(`leveledUpUser: ${leveledUpUser}`);

  console.log(`newUserLvl: ${newUserLvl}`);

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

// // Assigns starting decay date to all attributes with xp
// const assignStartingDecayDateToAttributeService = async (
//   id: number,
//   startingDecayDate: number,
// ): Promise<AttributeInDatabase | null> => {
//   const result = await pool.query<AttributeInDatabase>(
//     "UPDATE attributes SET decay_date = $2 WHERE id = $1 RETURNING *",
//     [id, startingDecayDate],
//   );
//   return result.rows[0] ?? null;
// };

// // Assigns a decay date if the attribute has no decays date and the attribute actually has xp
// const assignStartingDecayDateToAttribute = async () => {
//   // Get all attributes
//   const allAttributes = await getAllAttributesModel();

//   // Handling case in which allAttributes is null
//   if (!allAttributes) return new Error("Attributes could not be fetched");

//   // Checking if at least an attribute hasn't got a decay date and has xp
//   const hasXpAndNotDecayDate: boolean = allAttributes.some(
//     (attr) =>
//       !attr.decay_date &&
//       attr.xp !== null &&
//       attr.xp > 0 &&
//       attr.level !== null &&
//       attr.level >= 1,
//   );

//   // If no attributes have xp nor a decay date then stop execution
//   if (!hasXpAndNotDecayDate) return;

//   // Otherwise loop over the attributes and set the default decay date for whichever is the case

//   // Calculate today's UTC date
//   const today = new Date();
//   const todayUTC = new Date(
//     Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
//   );

//   // Calculate starting decay date
//   const startingDecayDate = todayUTC.setUTCDate(
//     todayUTC.getUTCDate() + STARTING_GRACE_PERIOD_IN_DAYS,
//   );

//   // Looping over all attributes
//   for (const attribute of allAttributes) {
//     if (attribute.xp !== null && attribute.xp < 1) continue;
//     else
//       await assignStartingDecayDateToAttributeService(
//         attribute.id,
//         startingDecayDate,
//       );
//   }
// };

// // --- Helper functions for decayAttributes ---

// // Checks if decay would eventually be applicable
// const isDecayApplicable = function (
//   allAttributes: AttributeInDatabase[],
// ): boolean | Error {
//   // Handling case in which allAttributes is null
//   if (!allAttributes) return new Error("Attributes could not be fetched");

//   /*
//     Checks whether at least an attribute has a decay date
//     Knowing this will determine whether the decay date check should start in the first place
//   */
//   const doAttributesHaveDecayDate: boolean = allAttributes.some(
//     (attr) => attr.decay_date,
//   );

//   // If no attributes have a decay date then stop execution, otherwise flag decay as applicable
//   if (!doAttributesHaveDecayDate) return false;
//   else return true;
// };

// // Gets all user attributes levels
// const getAllUserAttrLvls = function (allAttributes: AttributeInDatabase[]) {
//   // Split every attribute per owner
//   const everyUserAttributes: AttributesLvlsPerUser[] = [];

//   // Otherwise loop over the attributes array
//   // Looping over all attributes
//   for (const attribute of allAttributes) {
//     // Skip all attributes with no decay date
//     if (!attribute.decay_date) continue;

//     // Save user id and attribute level
//     const userId = attribute.users_id;
//     const level = attribute.level;

//     // If either userId and attribute level doesn't exist the stop loop execution
//     if (!userId || !level) break;

//     // Find if we already have an entry for this user
//     let entry = everyUserAttributes.find((user) => user.userId === userId);

//     // If no entry then create an object for user id and attribute level
//     if (!entry) {
//       entry = { userId, attributeLevels: [] };
//       everyUserAttributes.push(entry);
//     }

//     // Push attribute level in the already initialized array
//     entry.attributeLevels.push(level);
//   }

//   return everyUserAttributes;
// };

// // Calculates how much xp must be lost upon attribute decay
// function calculateDecayLoss(
//   xpToNextLevel: number,
//   userBuildMultiplier: number,
// ): number {
//   // The more built the pg, the harder the decay can be
//   const scaledPercent = DECAY_BASE_PERCENT * userBuildMultiplier;
//   const loss = Math.floor(xpToNextLevel * scaledPercent);
//   return Math.max(loss, 1); // almeno 1 xp
// }

// // Turns a local date in UTC format
// const toUTCDate = (localDate: Date) =>
//   new Date(
//     Date.UTC(
//       localDate.getUTCFullYear(),
//       localDate.getUTCMonth(),
//       localDate.getUTCDate(),
//     ),
//   );

// interface AttributeProgress {
//   level: number;
//   xp: number;
//   xp_to_next_level: number;
// }

// // Actually applies the decay to all attributes where is required
// function applyDecayToAttribute(
//   attr: AttributeProgress,
//   lossXp: number,
// ): AttributeProgress {
//   let { level, xp, xp_to_next_level } = attr;
//   let remainingLoss = lossXp;

//   // Edge case: attribute at level 1 with 0 XP → you can't go below
//   if (level === 1 && xp <= 0) {
//     return { level: 1, xp: 0, xp_to_next_level };
//   }

//   // Let's remove XP from the "hystory"
//   xp -= remainingLoss;

//   // Se scene sotto 0, può significare moltiplicare il livello
//   while (xp < 0 && level > 1) {
//     // To go down 1 level, we need to "return" the XP of the previous level
//     level -= 1;

//     const prevLevelThreshold = calculateNextLevelThresholdModel(level);

//     // If we lost more XP than we had in this level,
//     // we borrow from the previous level
//     xp += prevLevelThreshold;
//   }

//   // If we are back to level 1 and xp still < 0, clamp to 0
//   if (level === 1 && xp < 0) {
//     xp = 0;
//   }

//   // Recalculate xp_to_next_level consistent with new values
//   const fullCostForCurrentLevel = calculateNextLevelThresholdModel(level);
//   xp_to_next_level = fullCostForCurrentLevel - xp;

//   return { level, xp, xp_to_next_level };
// }

// // Compares dates and performs attributes decay
// const decayAttributes = async () => {
//   const allAttributes = await getAllAttributesModel();
//   if (!allAttributes) return new Error("No attribute exists");

//   if (!isDecayApplicable(allAttributes)) return;

//   const allUserAttrLvls = getAllUserAttrLvls(allAttributes);
//   if (!allUserAttrLvls) return new Error("No user attribute level exists");

//   const todayStr = toUTCDate(new Date()).toISOString().slice(0, 10);

//   for (const attribute of allAttributes) {
//     if (!attribute.decay_date) continue;

//     const decayStr = attribute.decay_date
//       ? attribute.decay_date.toISOString().slice(0, 10)
//       : null;

//     // 1) Only if today is the day of decay for this attribute
//     if (!decayStr || decayStr !== todayStr) continue;

//     // 2) Find the levels of ALL attributes of this user
//     const correspondingUserAttrLvls = allUserAttrLvls.find(
//       (attr) => attr.userId === attribute.users_id,
//     );
//     if (!correspondingUserAttrLvls)
//       return new Error("No corresponding user attribute level exists");

//     const userBuildMultiplier = overallAttributesMultiplier(
//       correspondingUserAttrLvls.attributeLevels,
//     );

//     // 3) Calculate how much XP to lose
//     const xpToNext =
//       attribute.xp_to_next_level ??
//       calculateNextLevelThresholdModel(attribute.level ?? 1);

//     const loss = calculateDecayLoss(xpToNext, userBuildMultiplier);

//     // 4) Apply the decay to this attribute
//     const current: AttributeProgress = {
//       level: attribute.level ?? 1,
//       xp: attribute.xp ?? 0,
//       xp_to_next_level: xpToNext,
//     };

//     const updated = applyDecayToAttribute(current, loss);

//     // 5) Persist
//     await pool.query(
//       `UPDATE attributes
//        SET level = $1,
//            xp = $2,
//            xp_to_next_level = $3
//        WHERE id = $4`,
//       [updated.level, updated.xp, updated.xp_to_next_level, attribute.id],
//     );

//     // 6) (optional) recalculates the new decay_date, e.g. starts again from the grace period
//     const newDecayDate = toUTCDate(new Date());
//     newDecayDate.setUTCDate(
//       newDecayDate.getUTCDate() + STARTING_GRACE_PERIOD_IN_DAYS,
//     );

//     await pool.query(
//       `UPDATE attributes
//        SET decay_date = $1
//        WHERE id = $2`,
//       [newDecayDate, attribute.id],
//     );
//   }
// };
