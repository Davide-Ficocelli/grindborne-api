import {
  ESTIMATED_TIME_BREAKPOINTS,
  AVG_QUEST_LVL_UP_WORTH,
  MS_IN_A_MINUTE,
  LEVEL_COST_SCALE_START,
  LEVEL_COST_SCALE_FACTOR,
  LEVEL_COST_BASE_MULTIPLIER,
  LEVEL_COST_OFFSET,
  LEVEL_COST_BASE_ADDITION,
  QUEST_ATTR_AVG_DIVISOR,
  TIME_DEVIATION_PENALTY_FACTOR,
  MIN_TIME_ACCURACY_MULTIPLIER,
} from "../config/globals.js";
import { type QuestInDb } from "../types/quest.js";
import { type AttributeInDb } from "../types/attribute.js";
import type ServiceValidation from "../types/serviceValidation.js";
import preventIdor from "../utils/preventIdor.js";
import { getUserByIdModel } from "../models/usersModel.js";
import {
  getAttributesByUserIdService,
  getAllAttributesToQuestService,
} from "../services/attributesService.js";
import { overallAttributesMultiplierHelper } from "../shared/attributesHelpers.js";

// --- Helper functions for completeQuestService ---

// Calculates the difference between two dates and returns it in minutes
export const calculateDatesDiffHelper = function (
  endDate: Date = new Date(),
  startDate: Date,
): number {
  const msDiff = endDate.getTime() - startDate.getTime();
  const diffInMinutes = Math.floor(msDiff / MS_IN_A_MINUTE); // ms -> minutes
  return Math.max(0, diffInMinutes);
};

// Calculates how much XP, in broad terms, a LEVEL-UP for the USER is worth.
export function calculateLevelCostHelper(level: number): number {
  const x = (level - LEVEL_COST_SCALE_START) * LEVEL_COST_SCALE_FACTOR;
  const xClamped = Math.max(0, x);
  const cost =
    (xClamped + LEVEL_COST_BASE_MULTIPLIER) *
      Math.pow(level + LEVEL_COST_OFFSET, 2) +
    LEVEL_COST_BASE_ADDITION;
  return Math.floor(cost);
}

// Returns the XP multiplier based on the quest's ESTIMATED duration (in minutes).
export const durationMultiplierHelper = function (
  estimatedMinutes: number | null,
): number {
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
export const questAttributesMultiplierHelper = function (
  questAttributeLevels: number[],
): number {
  if (questAttributeLevels.length === 0) return 0; // rewardable quest without attributes = bug

  const avgQuest =
    questAttributeLevels.reduce((sum, lvl) => sum + lvl, 0) /
    questAttributeLevels.length;

  // Example: average 20 → 1.2 ( +20% XP compared to base )
  return 1 + avgQuest / QUEST_ATTR_AVG_DIVISOR;
};

// Calculates how accurately the USER estimated the time needed for the quest.
export const timeAccuracyMultiplierHelper = function (
  estimatedMinutes: number | null,
  actualMinutes: number | null,
): number {
  if (!estimatedMinutes || !actualMinutes) return 1;

  const diff = Math.abs(actualMinutes - estimatedMinutes);
  const relativeDiff = diff / estimatedMinutes; // 0.2 = 20% deviation

  // 0% deviation → 1.0 (100% XP)
  // 50% deviation → 1 - 0.5 * 0.6 = 0.7 (70% XP)
  // 100%+ deviation → clamped to 0.4 (40% minimum XP)
  const multiplier = 1 - relativeDiff * TIME_DEVIATION_PENALTY_FACTOR;
  return Math.max(MIN_TIME_ACCURACY_MULTIPLIER, multiplier);
};

// Calculates the TOTAL XP reward for a completed quest.
export const calculateQuestTotalXPHelper = function (
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
  const levelCost = calculateLevelCostHelper(userLevel);

  // Base reward: a "typical" quest is worth about 20% of a level-up
  const baseReward = levelCost * AVG_QUEST_LVL_UP_WORTH;

  // Multiplier based on the attributes involved in this quest
  const questAttrMult = questAttributesMultiplierHelper(questAttributeLevels);

  // Multiplier based on the user's overall build (all attributes)
  const overallAttrMult = overallAttributesMultiplierHelper(allAttributeLevels);

  // Time estimation bonus/malus
  const timeMult = timeAccuracyMultiplierHelper(
    estimatedMinutes,
    actualMinutes,
  );

  // Duration-based soft cap: longer quests have more potential XP
  const durationMult = durationMultiplierHelper(estimatedMinutes);

  const totalExp =
    baseReward * questAttrMult * overallAttrMult * timeMult * durationMult;

  return Math.floor(totalExp);
};

// Validates all checks before completing a quest and returns all values needed to calculate the total xp reward
export const validateQuestToBeCompletedHelper = async function (
  questToBeCompleted: QuestInDb,
  userId: string,
): Promise<ServiceValidation> {
  const { isIdorDetected, status, message } = preventIdor(
    userId,
    questToBeCompleted.users_id,
  );
  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };
  if (questToBeCompleted.is_completed)
    return {
      ok: false,
      status: 400,
      message: "Cannot complete a quest that is already completed",
    };
  if (!questToBeCompleted.is_tracked)
    return {
      ok: false,
      status: 400,
      message:
        "Cannot complete an untracked quest. Only tracked quests can be completed",
    };

  const user = await getUserByIdModel(userId);
  if (!user)
    return {
      ok: false,
      status: 404,
      message: "Authenticated user could not be found",
    };

  const {
    ok: userAttrsOk,
    status: userAttrsStatus,
    message: userAttrsMessage,
    data: userAttrsData,
  } = await getAttributesByUserIdService(userId);
  if (!userAttrsOk)
    return {
      ok: userAttrsOk,
      status: userAttrsStatus,
      message: userAttrsMessage,
    };

  const userAttributes = userAttrsData as AttributeInDb[];
  const { id: questId } = questToBeCompleted;

  const {
    ok: attrsToQuestOk,
    status: attrsToQuestStatus,
    message: attrsToQuestMessage,
    data: attrsToQuestData,
  } = await getAllAttributesToQuestService(questId, userId);
  if (!attrsToQuestOk)
    return {
      ok: attrsToQuestOk,
      status: attrsToQuestStatus,
      message: attrsToQuestMessage,
      data: attrsToQuestData,
    };

  const attributesToBeComQuest = attrsToQuestData as AttributeInDb[];
  const { level: userLevel } = user;
  const userAttributesLvls = userAttributes.map((attr) => Number(attr.level));
  const attributesToQuestLvls = attributesToBeComQuest.map((attr) =>
    Number(attr.level),
  );

  return {
    ok: true,
    status: 202,
    message: "Quest to be completed is valid",
    data: {
      userLevel: Number(userLevel),
      userAttributesLvls,
      attributesToQuestLvls,
    },
  };
};

export type DataForXp = {
  userLevel: number;
  userAttributesLvls: number[];
  attributesToQuestLvls: number[];
};
