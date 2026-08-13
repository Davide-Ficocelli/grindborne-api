import {
  INITIAL_XP_TO_NEXT_LEVEL,
  NEW_ATTR_LEVEL_XP_COST_SCALING,
  DECAY_BASE_PERCENT,
  REQUIRED_AVG_ATTR_LVLS_FOR_BUILD_SCALING,
  STARTING_GRACE_PERIOD_IN_DAYS,
  DECAY_DATE_RENEWAL_THRESHOLD,
} from "../config/globals.js";
import type {
  AttributeInDb,
  AttributesLvlsPerUser,
} from "../types/attribute.js";
import { updateAttributeModel } from "../models/attributesModel.js";
import toUTCDate from "../utils/toUTCDate.js";

// Calculates an XP multiplier based on the AVERAGE LEVEL of ALL user attributes.
export const overallAttributesMultiplierHelper = function (
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

// --- Helper functions for assignXpToAttrsAndUserService ---

// Calculates how much XP is needed to go from current level to next level for an ATTRIBUTE
export function calculateNextAttrLevelThresholdHelper(level: number): number {
  const base = INITIAL_XP_TO_NEXT_LEVEL; // XP needed to go from level 1 to 2
  const scale = NEW_ATTR_LEVEL_XP_COST_SCALING; // each new level increases the requirement by 20%

  // level 1 -> 100
  // level 2 -> 120
  // level 3 -> 140
  const cost = base * (1 + (level - 1) * scale);
  return Math.round(cost);
}

// Determines whether a new level up is required
export const isLevelUpRequiredHelper = (
  remainingXpToDistribute: number,
  xpToNext: number,
): boolean => remainingXpToDistribute >= xpToNext;

// Calculates the XP to be distributed to each attribute evenly
export const calculateXpPerAttributeHelper = (
  questTotalXp: number,
  numberOfAttributes: number,
): number => {
  return Math.floor(questTotalXp / numberOfAttributes);
};

// Processes the XP gain for a single attribute, handling level ups
export const calculateAttributeXpProgressHelper = (
  attr: AttributeInDb,
  xpToAdd: number,
) => {
  let remainingXpToDistributePerAttr = xpToAdd;
  let level = attr.level ?? 1;
  let xp = attr.xp ?? 0;
  let xpToNext =
    attr.xp_to_next_level ?? calculateNextAttrLevelThresholdHelper(level);
  let totalXpToNextLvl = xp + xpToNext;

  xp += remainingXpToDistributePerAttr;

  while (isLevelUpRequiredHelper(remainingXpToDistributePerAttr, xpToNext)) {
    remainingXpToDistributePerAttr -= xpToNext;
    level += 1;
    xp -= totalXpToNextLvl;
    xpToNext = calculateNextAttrLevelThresholdHelper(level);
    totalXpToNextLvl = xpToNext;
  }

  xpToNext -= remainingXpToDistributePerAttr;

  return { level, xp, xpToNext };
};

// Extracts an array of levels from an array of user attributes
export const extractUserAttributesLvlsHelper = (
  userAttributes: AttributeInDb[],
): number[] => {
  return userAttributes.map((attr) => attr.level as number);
};

// Determines if the attribute's decay date should be extended.
// This happens if the attribute levels up or gains a significant amount of XP.
export const extendAttrDecayDateHelper = function (attrDataObj: {
  level: number;
  attr: AttributeInDb;
  xpForEachAttribute: number;
}) {
  // Check if the attribute has leveled up.
  const leveledUp = attrDataObj.level > (attrDataObj.attr.level ?? 1);

  // Calculate the XP threshold required for a "significant gain". This is a percentage
  // of the XP needed for the attribute's next level, defined by DECAY_DATE_RENEWAL_THRESHOLD.
  const xpThreshold =
    attrDataObj.attr.xp_to_next_level * DECAY_DATE_RENEWAL_THRESHOLD;

  // Check if the XP gained meets or exceeds the significant gain threshold.
  const significantXpGain = attrDataObj.xpForEachAttribute >= xpThreshold;

  let newDecayDate: Date | undefined = undefined;

  // The decay date can only be renewed if the attribute has an existing decay date
  // and has either leveled up or gained significant XP.
  if ((leveledUp || significantXpGain) && attrDataObj.attr.decay_date) {
    const today = toUTCDate(new Date());

    // Calculate the maximum possible decay date, which is today + the standard grace period.
    // The decay date cannot be extended beyond this cap.
    const maxDecayDate = toUTCDate(new Date());
    maxDecayDate.setUTCDate(today.getUTCDate() + STARTING_GRACE_PERIOD_IN_DAYS);

    const currentDecayDate = toUTCDate(attrDataObj.attr.decay_date);

    // Only extend the decay date if it's not already at its maximum.
    if (currentDecayDate.getTime() < maxDecayDate.getTime()) {
      // Calculate the potential new decay date by adding one day to the current one.
      const potentialNewDecayDate = new Date(currentDecayDate);
      potentialNewDecayDate.setUTCDate(currentDecayDate.getUTCDate() + 1);

      // Clamp the new decay date to the maximum allowed value.
      newDecayDate =
        potentialNewDecayDate > maxDecayDate
          ? maxDecayDate
          : potentialNewDecayDate;

      return newDecayDate;
    }
  }
};

// // --- Helper functions for decayAttributes ---

// Gets all user attributes levels
export const getAllUserAttrLvlsHelper = function (
  allAttributes: AttributeInDb[],
) {
  // Split every attribute per owner
  const allAttrsForEachUser: AttributesLvlsPerUser[] = [];

  // Otherwise loop over the attributes array
  // Looping over all attributes
  for (const attribute of allAttributes) {
    // Skip all attributes with no decay date
    if (!attribute.decay_date) continue;

    // Save user id and attribute level
    const userId = attribute.users_id;
    const level = attribute.level;

    // If either userId and attribute level doesn't exist the stop loop execution
    if (!userId || !level) break;

    // Find if we already have an entry for this user
    let entry = allAttrsForEachUser.find((user) => user.userId === userId);

    // If no entry then create an object for user id and attribute level
    if (!entry) {
      entry = { userId, attributeLevels: [] };
      allAttrsForEachUser.push(entry);
    }

    // Push attribute level in the already initialized array
    entry.attributeLevels.push(level);
  }

  return allAttrsForEachUser;
};

// Calculates how much xp must be lost upon attribute decay
export function calculateDecayLossHelper(
  xpToNextLevel: number,
  userBuildMultiplier: number,
): number {
  // The more built the pg, the harder the decay can be
  const scaledPercent = DECAY_BASE_PERCENT * userBuildMultiplier;
  const loss = Math.floor(xpToNextLevel * scaledPercent);
  return Math.max(loss, 1); // almeno 1 xp
}

export interface AttributeProgress {
  level: number;
  xp: number;
  xp_to_next_level: number;
}

// Actually applies the decay to all attributes where is required
export function applyDecayToAttributeHelper(
  attr: AttributeProgress,
  lossXp: number,
): AttributeProgress {
  let { level, xp, xp_to_next_level } = attr;
  let remainingLoss = lossXp;

  // Edge case: attribute at level 1 with 0 XP → you can't go below
  if (level === 1 && xp <= 0) {
    return { level: 1, xp: 0, xp_to_next_level };
  }

  // Let's remove XP from the "hystory"
  xp -= remainingLoss;

  // If the value is below 0, this may mean multiplying the level
  while (xp < 0 && level > 1) {
    // To go down 1 level, we need to "return" the XP of the previous level
    level -= 1;

    const prevLevelThreshold = calculateNextAttrLevelThresholdHelper(level);

    // If we lost more XP than we had in this level,
    // we borrow from the previous level
    xp += prevLevelThreshold;
  }

  // If we are back to level 1 and xp still < 0, clamp to 0
  if (level === 1 && xp < 0) {
    xp = 0;
  }

  // Recalculate xp_to_next_level consistent with new values
  const fullCostForCurrentLevel = calculateNextAttrLevelThresholdHelper(level);
  xp_to_next_level = fullCostForCurrentLevel - xp;

  return { level, xp, xp_to_next_level };
}

// Checks for an attribute decay eligibility and applies decay if affermative
export const decayAttributeHelper = async (
  currentAttr: AttributeInDb,
  allUserAttrLvls: AttributesLvlsPerUser[],
) => {
  // Find the levels of ALL attributes of this user
  const correspondingUserAttrLvls = allUserAttrLvls.find(
    (attr) => attr.userId === currentAttr.users_id,
  );

  // Return an error status if no user attribute levels were found
  if (!correspondingUserAttrLvls) {
    console.error(
      `[Cron] Could not find user attribute levels for attribute ${currentAttr.id} (user: ${currentAttr.users_id}). Skipping decay for this attribute.`,
    );
    return;
  }

  const userBuildMultiplier = overallAttributesMultiplierHelper(
    correspondingUserAttrLvls.attributeLevels,
  );

  // Calculate how much XP to lose
  const xpToNext =
    currentAttr.xp_to_next_level ??
    calculateNextAttrLevelThresholdHelper(currentAttr.level ?? 1);

  const totalXpToNextLvl = xpToNext + (currentAttr.xp ?? 0);

  const loss = calculateDecayLossHelper(totalXpToNextLvl, userBuildMultiplier);

  // Apply decay to this attribute
  const current: AttributeProgress = {
    level: currentAttr.level ?? 1,
    xp: currentAttr.xp ?? 0,
    xp_to_next_level: xpToNext,
  };

  const updated = applyDecayToAttributeHelper(current, loss);

  // 5) Persist
  await updateAttributeModel(currentAttr.id, updated);

  // 6) Recalculates the new decay_date, e.g. starts again from the grace period
  const newDecayDate = toUTCDate(new Date());
  newDecayDate.setUTCDate(
    newDecayDate.getUTCDate() + STARTING_GRACE_PERIOD_IN_DAYS,
  );

  await updateAttributeModel(currentAttr.id, { decay_date: newDecayDate });
};
