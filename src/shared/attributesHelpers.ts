import {
  INITIAL_XP_TO_NEXT_LEVEL,
  NEW_ATTR_LEVEL_XP_COST_SCALING,
} from "../config/globals.ts";
import type { AttributeInDatabase } from "../types/attribute.ts";

// import pool from "../config/db.ts";
// import { type AttributeInDatabase } from "../types/attribute.ts";
// import { getAllAttributesModel } from "../models/attributesModel.ts";
// import { STARTING_GRACE_PERIOD_IN_DAYS, DECAY_BASE_PERCENT } from "../config/globals.ts";
// import { overallAttributesMultiplier } from "./questsHelpers.ts";

// --- Helper functions for assignXpToAttrsAndUserService ---

// Calculates how much XP is needed to go from current level to next level for an ATTRIBUTE
export function calculateNextAttrLevelThreshold(level: number): number {
  const base = INITIAL_XP_TO_NEXT_LEVEL; // XP needed to go from level 1 to 2
  const scale = NEW_ATTR_LEVEL_XP_COST_SCALING; // each new level increases the requirement by 20%

  // level 1 -> 100
  // level 2 -> 120
  // level 3 -> 140
  const cost = base * (1 + (level - 1) * scale);
  return Math.round(cost);
}

// Determines whether a new level up is required
export const isLevelUpRequired = (
  remainingXpToDistribute: number,
  xpToNext: number,
): boolean => remainingXpToDistribute >= xpToNext;

// Calculates the XP to be distributed to each attribute evenly
export const calculateXpPerAttribute = (
  questTotalXp: number,
  numberOfAttributes: number,
): number => {
  return Math.floor(questTotalXp / numberOfAttributes);
};

// Processes the XP gain for a single attribute, handling level ups
export const calculateAttributeXpProgress = (
  attr: AttributeInDatabase,
  xpToAdd: number,
) => {
  let remainingXpToDistributePerAttr = xpToAdd;
  let level = attr.level ?? 1;
  let xp = attr.xp ?? 0;
  let xpToNext =
    attr.xp_to_next_level ?? calculateNextAttrLevelThreshold(level);
  let totalXpToNextLvl = xp + xpToNext;

  xp += remainingXpToDistributePerAttr;

  while (isLevelUpRequired(remainingXpToDistributePerAttr, xpToNext)) {
    remainingXpToDistributePerAttr -= xpToNext;
    level += 1;
    xp -= totalXpToNextLvl;
    xpToNext = calculateNextAttrLevelThreshold(level);
    totalXpToNextLvl = xpToNext;
  }

  xpToNext -= remainingXpToDistributePerAttr;

  return { level, xp, xpToNext };
};

// Extracts an array of levels from an array of user attributes
export const extractUserAttributesLvls = (
  userAttributes: AttributeInDatabase[],
): number[] => {
  return userAttributes.map((attr) => attr.level as number);
};

// // Assigns starting decay date to all attributes with xp
// export const assignStartingDecayDateToAttributeService = async (
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
// export const assignStartingDecayDateToAttribute = async () => {
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
// export const isDecayApplicable = function (
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
// export const getAllUserAttrLvls = function (allAttributes: AttributeInDatabase[]) {
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
// export function calculateDecayLoss(
//   xpToNextLevel: number,
//   userBuildMultiplier: number,
// ): number {
//   // The more built the pg, the harder the decay can be
//   const scaledPercent = DECAY_BASE_PERCENT * userBuildMultiplier;
//   const loss = Math.floor(xpToNextLevel * scaledPercent);
//   return Math.max(loss, 1); // almeno 1 xp
// }

// // Turns a local date in UTC format
// export const toUTCDate = (localDate: Date) =>
//   new Date(
//     Date.UTC(
//       localDate.getUTCFullYear(),
//       localDate.getUTCMonth(),
//       localDate.getUTCDate(),
//     ),
//   );

// export interface AttributeProgress {
//   level: number;
//   xp: number;
//   xp_to_next_level: number;
// }

// // Actually applies the decay to all attributes where is required
// export function applyDecayToAttribute(
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

//     const prevLevelThreshold = calculateNextAttrLevelThreshold(level);

//     // If we lost more XP than we had in this level,
//     // we borrow from the previous level
//     xp += prevLevelThreshold;
//   }

//   // If we are back to level 1 and xp still < 0, clamp to 0
//   if (level === 1 && xp < 0) {
//     xp = 0;
//   }

//   // Recalculate xp_to_next_level consistent with new values
//   const fullCostForCurrentLevel = calculateNextAttrLevelThreshold(level);
//   xp_to_next_level = fullCostForCurrentLevel - xp;

//   return { level, xp, xp_to_next_level };
// }

// // Compares dates and performs attributes decay
// export const decayAttributes = async () => {
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
//       calculateNextAttrLevelThreshold(attribute.level ?? 1);

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
