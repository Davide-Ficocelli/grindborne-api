// Importing types
import type ServiceValidation from "../types/serviceValidation.ts";

// Importing global variables
import {
  REQUIRED_AVG_ATTR_LVLS_FOR_BUILD_SCALING,
  ESTIMATED_TIME_BREAKPOINTS,
} from "../config/globals.ts";

// Importing types
import { type NewQuestInput, type Quest } from "../types/quest.ts";

// Importing functions
import preventIdor from "../utils/preventIdor.ts";
import {
  getQuestByIdModel,
  getQuestsByUserIdModel,
  updateQuestModel,
  createNewQuestModel,
  addAttributesToQuestModel,
} from "../models/questsModel.ts";
import { assignXpToAttributesAndUserService } from "../services/attributesService.ts";
import { getUserByIdService } from "../models/usersModel.ts";
import {
  getAttributesByUserIdModel,
  getAllAttributesToQuestModel,
} from "../models/attributesModel.ts";

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

// Gets quest by its id
export const getQuestByIdService = async (
  id: number,
  userId: number,
): Promise<ServiceValidation> => {
  // Get quest by id
  const quest = await getQuestByIdModel(id);

  // If quest wasn't found return an error message
  if (!quest) return { ok: false, status: 404, message: "Quest not found" };

  // Prevent IDOR
  const { isIdorDetected, status, message } = preventIdor(
    userId,
    quest.users_id,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // If everything went well then return a successfull response along with the data
  return {
    ok: true,
    status: 200,
    message: "Quest fetched successfully",
    data: quest,
  };
};

// Gets quest by user's id
export const getQuestsByUserIdService = async (
  userId: number,
): Promise<ServiceValidation> => {
  // Get quest by id
  const userQuests = await getQuestsByUserIdModel(userId);

  // If quests weren't found return an error message
  if (!userQuests)
    return { ok: false, status: 404, message: "Quest not found" };

  // Prevent IDOR
  const { isIdorDetected, status, message } = preventIdor(
    userId,
    (userQuests[0] as Quest)?.users_id,
  );

  // Use both the preventIdor function and a more in depth check
  if (isIdorDetected || userQuests.some((q) => q.users_id !== userId))
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // If everything went well then return a successfull response along with the data
  return {
    ok: true,
    status: 200,
    message: "Quest fetched successfully",
    data: userQuests,
  };
};

// --- Helper functions for createNewQuestService ---

// Creates a new quest
export const createNewQuestService = async (
  attributes_ids: number[],
  questObj: NewQuestInput,
) => {
  // Validating new quest request
  if (questObj.is_rewardable) {
    // If attributes_id is either not an array or an empty one stop execution
    if (!Array.isArray(attributes_ids) || attributes_ids.length === 0)
      return {
        ok: false,
        status: 400,
        message: "Rewardable quests must have at least one attribute id",
      };
    // If there's no estimated time, stop execution
    else if (!questObj.estimated_time)
      return {
        ok: false,
        status: 400,
        message: "Rewardable quests must have an estimated time",
      };
    // if not rewardable, there must be NO attributes
  } else if (
    !questObj.is_rewardable &&
    Array.isArray(attributes_ids) &&
    attributes_ids.length > 0
  )
    return {
      ok: false,
      status: 400,
      message: "Non-rewardable quests cannot have attributes",
    };

  // Once all validations are passed, create the new quest in the db
  const newQuest = await createNewQuestModel({ ...questObj });

  // If the client asked to track the quest upon creation then it's done now
  let questToReturn = newQuest;

  if (questObj.is_tracked) {
    const trackedQuest = await trackQuestService((newQuest as Quest).id);
    if (trackedQuest) questToReturn = trackedQuest;
    else
      return { ok: false, status: 500, message: "Quest could not be tracked" };
  }

  // Populates the join table quests_attributes with both quests and attributes' ids
  await addAttributesToQuestModel((newQuest as Quest).id, attributes_ids);

  return {
    ok: true,
    status: 201,
    message: "Quest successfully created",
    data: questToReturn,
  };
};

// ─────────────────────────────────────────────
// --- BUSINESS LOGIC SERVICE FUNCTIONS ---
// ─────────────────────────────────────────────

// --- Helper functions for completeQuestService ---

// Calculates the difference between two dates and returns it in minutes
const calculateDatesDiff = function (
  endDate: Date = new Date(),
  startDate: Date,
): number {
  const msDiff = endDate.getTime() - startDate.getTime();
  const diffInMinutes = Math.floor(msDiff / (1000 * 60)); // ms -> minutes
  return Math.max(0, diffInMinutes);
};

// Calculates how much XP, in broad terms, a LEVEL-UP for the USER is worth.
// This value is used as a baseline scale to understand how much a quest should reward,
// depending on the user's current level: the higher the level, the more expensive it is to level up.
export function calculateLevelCost(level: number): number {
  const x = (level - 11) * 0.02;
  const xClamped = Math.max(0, x);
  const cost = (xClamped + 0.1) * Math.pow(level + 81, 2) + 1;
  return Math.floor(cost);
}

// Returns the XP multiplier based on the quest's ESTIMATED duration (in minutes).
// The idea is that longer quests have a higher potential XP reward,
// but with an upper cap of 1 to avoid very long quests becoming overpowered.
// If no estimated time is provided, the multiplier is 0 (cannot compute a reward).
const durationMultiplier = function (estimatedMinutes: number | null): number {
  if (!estimatedMinutes) return 0;

  // Save breakpoints values and breakpoints multipliers values
  const { breakpoints, xpMultipliers, standardXpMultiplier } =
    ESTIMATED_TIME_BREAKPOINTS;

  // Initialize multiplier
  let xpMultiplier: number = 1;

  // Breakpoints for estimated duration with their corresponding XP multipliers
  for (const [i, breakpoint] of breakpoints.entries()) {
    // If estimated minutes are greater then the current breakpoint go to the next iteration
    if (estimatedMinutes > breakpoint) continue;
    // If estimated minutes are below the current breakpoint then assign the final multiplier's value
    else if (estimatedMinutes < breakpoint) {
      xpMultiplier = xpMultipliers[i] as number;
      // Exit the loop
      break;
      // If estimated minutes are greater than all breakpoints then assign the standard multiplier
    } else {
      xpMultiplier = standardXpMultiplier;
      // Exit the loop
      break;
    }
  }
  // Return the caltulated multiplier
  return xpMultiplier;
};

// Calculates an XP multiplier based on the LEVELS of the attributes involved in this quest.
// The higher the involved attributes, the more the quest "deserves" extra XP.
// If the array is empty, it means a rewardable quest has no attributes: that's an error case.
const questAttributesMultiplier = function (
  questAttributeLevels: number[],
): number {
  if (questAttributeLevels.length === 0) return 0; // rewardable quest without attributes = bug

  const avgQuest =
    questAttributeLevels.reduce((sum, lvl) => sum + lvl, 0) /
    questAttributeLevels.length;

  // Example: average 20 → 1.2 ( +20% XP compared to base )
  return 1 + avgQuest / 100;
};

// Calculates how accurately the USER estimated the time needed for the quest.
// It compares the estimated time with the actual time and returns a multiplier:
// - perfect estimate → 1 (100% XP)
// - the further from the estimate → lower multiplier, down to a minimum of 40%.
// If either timestamp is missing, no bonus/malus is applied (multiplier 1).
const timeAccuracyMultiplier = function (
  estimatedMinutes: number | null,
  actualMinutes: number | null,
): number {
  if (!estimatedMinutes || !actualMinutes) return 1;

  const diff = Math.abs(actualMinutes - estimatedMinutes);
  const relativeDiff = diff / estimatedMinutes; // 0.2 = 20% deviation

  // 0% deviation → 1.0 (100% XP)
  // 50% deviation → 1 - 0.5 * 0.6 = 0.7 (70% XP)
  // 100%+ deviation → clamped to 0.4 (40% minimum XP)
  const multiplier = 1 - relativeDiff * 0.6;
  return Math.max(0.4, multiplier);
};

// Calculates an XP multiplier based on the AVERAGE LEVEL of ALL user attributes.
// This represents how developed the character is overall: more advanced builds
// make quests potentially more rewarding in terms of XP.
// If the user has no attributes, the multiplier is neutral (1).
export const overallAttributesMultiplier = function (
  allAttributeLevels: number[],
): number {
  if (allAttributeLevels.length === 0) return 1;

  const avgAll =
    allAttributeLevels.reduce((sum, lvl) => sum + lvl, 0) /
    allAttributeLevels.length;

  // Example: average 10 → 1 + 10/10 = 2.0 (x2)
  //          average 20 → 1 + 20/10 = 3.0 (x3)
  return 1 + avgAll / REQUIRED_AVG_ATTR_LVLS_FOR_BUILD_SCALING;
};

// Calculates the TOTAL XP reward for a completed quest.
// It combines:
// - the "cost" of a level-up for the user (base scale),
// - how high the quest-related attributes are,
// - how built the character is overall (all attributes),
// - how long the quest is (estimated time),
// - how close the actual time is to the estimate.
// The result is a single XP value (total_xp) to be stored on the quest.
const calculateQuestTotalXP = function (
  userLevel: number,
  questAttributeLevels: number[],
  allAttributeLevels: number[],
  estimatedMinutes: number | null,
  actualMinutes: number | null,
): number {
  if (questAttributeLevels.length === 0) {
    return 0; // safety: a rewardable quest without attributes should not exist
  }

  // Base scale: how much it "costs" to level up the user in XP
  const levelCost = calculateLevelCost(userLevel);

  // Base reward: a "typical" quest is worth about 20% of a level-up
  const baseReward = levelCost * 0.2;

  // Multiplier based on the attributes involved in this quest
  const questAttrMult = questAttributesMultiplier(questAttributeLevels);

  // Multiplier based on the user's overall build (all attributes)
  const overallAttrMult = overallAttributesMultiplier(allAttributeLevels);

  // Time estimation bonus/malus
  const timeMult = timeAccuracyMultiplier(estimatedMinutes, actualMinutes);

  // Duration-based soft cap: longer quests have more potential XP
  const durationMult = durationMultiplier(estimatedMinutes);

  const totalExp =
    baseReward * questAttrMult * overallAttrMult * timeMult * durationMult;

  return Math.floor(totalExp);
};

type CompletedQuestValidationResult = {
  ok: boolean;
  status?: number;
  message?: string;
  userLevel?: number;
  userAttributesLvls?: number[];
  attributesToQuestLvls?: number[];
};

// Validates all checks before completing a quest and returns all values needed to calculate the total xp reward
const validateCompletedQuest = async function (
  userId: number,
  questId: number,
): Promise<CompletedQuestValidationResult> {
  // Getting user's quest to be completed
  const userQuestToComplete = await getQuestByIdModel(questId);

  // If user's quest to be completed could not be found then stop execution returning an error message
  if (!userQuestToComplete)
    return {
      ok: false,
      status: 404,
      message: "Quest to be completed could not be found",
    };

  // Prevent IDOR from quest data

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    userQuestToComplete?.users_id,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Do not allow quest completion if quest to be completed has already been completed
  if (userQuestToComplete.is_completed)
    return {
      ok: false,
      status: 400,
      message: "Cannot complete a quest that is already completed",
    };

  // Do not allow quest completion if quest to be completed is not being tracked
  if (!userQuestToComplete.is_tracked)
    return {
      ok: false,
      status: 400,
      message:
        "Cannot complete an untracked quest. Only tracked quests can be completed",
    };

  // Get all user's attributes
  const userAttributes = await getAttributesByUserIdModel(userId);

  // If authenticated user's attributes could not be found then stop execution returning an error message
  if (!userAttributes)
    return {
      ok: false,
      status: 404,
      message: "User's attributes could not be found",
    };

  // Prevent IDOR from user attributes data

  if (userAttributes.some((attr) => attr.users_id !== userId))
    return {
      ok: false,
      status: 403,
      message: "Data owner and authenticated user don't match",
    };

  // Get all user's attributes involved in the quest to be completed by using the id passed in the params
  const attributesToBeComQuest = await getAllAttributesToQuestModel(questId);

  // If attributes could not be found then stop execution returning an error message
  if (!attributesToBeComQuest)
    return {
      ok: false,
      status: 404,
      message:
        "Attributes involved in quest to be completed could not be found",
    };

  // Preventing IDOR (Insecure Direct Object Reference) from  both userAttributes and attributes to quest to be completed
  /*
    Compare authenticated user's id with registered users_id upon attributes creation.
    If at least one attribute among the ones owned by the user or those owned by them and involved in the quest
    to be completed has the users_id value not matching with authenticated user's id
    then stop execution returning an error message
  */
  if (attributesToBeComQuest.some((attr) => attr.users_id !== userId))
    return {
      ok: false,
      status: 403,
      message: "Data owner and authenticated user don't match",
    };

  // Find the authenticated user
  const user = await getUserByIdService(userId);

  // Handle case in which user is null
  if (!user)
    return {
      ok: false,
      status: 404,
      message: "Authenticated user could not be found",
    };

  // Getting user level
  const { level: userLevel } = user;

  // Getting user attributes levels
  const userAttributesLvls = userAttributes.map((attr) => Number(attr.level));

  // Getting user attributes level tied to quest to complete
  const attributesToQuestLvls = attributesToBeComQuest.map((attr) =>
    Number(attr.level),
  );

  return {
    ok: true,
    userLevel: Number(userLevel),
    userAttributesLvls,
    attributesToQuestLvls,
  };
};

// Completes a quest
export const completeQuestService = async (
  id: number,
  userId: number,
): Promise<ServiceValidation> => {
  // Get quest to be completed
  const questToBeCompleted = await getQuestByIdModel(id);

  // If quest to be completed wasn't found then stop execution
  if (!questToBeCompleted)
    return {
      ok: false,
      status: 404,
      message: "Quest to be completed was not found",
    };

  const {
    ok,
    status,
    message,
    userLevel,
    userAttributesLvls,
    attributesToQuestLvls,
  } = await validateCompletedQuest(userId, id);

  // If quest validation failed then stop execution
  if (!ok) return { ok, status: status ?? 0, message: message ?? "" };

  // Get quest's is_rewardable and estimated_time value
  const { is_rewardable, estimated_time, tracked_at } = questToBeCompleted;

  // Validate quest
  let result;
  // If is not rewardable then just mark the quest as completed and stop the tracking
  if (!is_rewardable) {
    result = await updateQuestModel(id, {
      is_tracked: false,
      is_completed: true,
      completed_at: new Date(),
      estimated_time: estimated_time as number,
    });

    // Handle case in which result is null
    if (!result)
      return {
        ok: false,
        status: 500,
        message: "A problem occured while completing the quest",
      };

    return {
      ok: true,
      status: 200,
      message: "Quest successfully completed",
      data: result,
    };
  }
  // If quest is rewardable calculate total xp and actual time
  else if (is_rewardable) {
    // Calculate the actual time spent to complete the quest
    const completed_at = new Date();
    const actual_time = calculateDatesDiff(completed_at, tracked_at as Date);

    // Calculate total xp reward for quest
    const questTotalXp: number = calculateQuestTotalXP(
      userLevel as number,
      attributesToQuestLvls as number[],
      userAttributesLvls as number[],
      estimated_time as number,
      actual_time,
    );

    // Assign xp to involved attributes in the quest
    const {
      ok,
      status,
      message,
      data: userData,
    } = await assignXpToAttributesAndUserService(id, questTotalXp, userId);

    // If xp assig went wrong stop execution
    if (!ok) return { ok, status, message };

    // Update the quest data accordingly
    result = await updateQuestModel(id, {
      is_completed: true,
      is_tracked: false,
      completed_at: new Date(),
      estimated_time: estimated_time as number,
      total_xp: questTotalXp,
      actual_time: actual_time,
    });

    // Handle case in which result is null
    if (!result)
      return {
        ok: false,
        status: 500,
        message: "A problem occured while completing the quest",
      };

    // Return successful message if everything went as expected
    return {
      ok: true,
      status: 200,
      message: "Quest completed successfully",
      data: { quest: result, userData },
    };
  } else
    return {
      ok: false,
      status: 500,
      message: "Something went wrong during quest completion",
    };
};
