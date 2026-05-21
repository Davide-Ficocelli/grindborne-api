import pool from "../config/db.ts";
import updateRow from "../utils/updateRow.ts";
import { calculateUserLvl, assignNewUserLvlService } from "./usersModel.ts";
import {
  STARTING_GRACE_PERIOD_IN_DAYS,
  NEW_ATTR_LEVEL_XP_COST_SCALING,
  DECAY_BASE_PERCENT,
} from "../config/globals.ts";
import { overallAttributesMultiplier } from "./questsModel.ts";

// Importing types
import type Attribute from "../types/attribute.ts";
import type { AttributesLvlsPerUser } from "../types/attribute.ts";
import handleResponse from "../utils/handleResponse.ts";

// -- HELPER FUNCTIONS --

function calculateDecayLoss(
  xpToNextLevel: number,
  userBuildMultiplier: number,
): number {
  // Più il pg è buildato, più il decay può essere duro
  const scaledPercent = DECAY_BASE_PERCENT * userBuildMultiplier;
  const loss = Math.floor(xpToNextLevel * scaledPercent);
  return Math.max(loss, 1); // almeno 1 xp
}

interface AttributeProgress {
  level: number;
  xp: number;
  xp_to_next_level: number;
}

function applyDecayToAttribute(
  attr: AttributeProgress,
  lossXp: number,
): AttributeProgress {
  let { level, xp, xp_to_next_level } = attr;
  let remainingLoss = lossXp;

  // Caso limite: attributo al livello 1 con 0 XP → non puoi scendere sotto
  if (level === 1 && xp <= 0) {
    return { level: 1, xp: 0, xp_to_next_level };
  }

  // Togliamo XP dallo "storico"
  xp -= remainingLoss;

  // Se scende sotto 0, può significare level-down multipli
  while (xp < 0 && level > 1) {
    // Per scendere di 1 livello, dobbiamo "restituire" l'XP del livello precedente
    level -= 1;

    const prevLevelThreshold = calculateNextLevelThreshold(level);

    // Se abbiamo perso più XP di quella che avevamo in questo livello,
    // prendiamo in prestito dal livello precedente
    xp += prevLevelThreshold;
  }

  // Se siamo tornati al livello 1 e xp ancora < 0, clamp a 0
  if (level === 1 && xp < 0) {
    xp = 0;
  }

  // Ricalcola xp_to_next_level coerente con i nuovi valori
  const fullCostForCurrentLevel = calculateNextLevelThreshold(level);
  xp_to_next_level = fullCostForCurrentLevel - xp;

  return { level, xp, xp_to_next_level };
}

// Checks if decay would eventually be applicable
const isDecayApplicable = function (
  allAttributes: Attribute[],
): boolean | Error {
  // Handling case in which allAttributes is null
  if (!allAttributes) return new Error("Attributes could not be fetched");

  /*
    Checks whether at least an attribute has a decay date
    Knowing this will determine whether the decay date check should start in the first place
  */
  const doAttributesHaveDecayDate: boolean = allAttributes.some(
    (attr) => attr.decay_date,
  );

  // If no attributes have a decay date then stop execution, otherwise flag decay as applicable
  if (!doAttributesHaveDecayDate) return false;
  else return true;
};

// Turns a local date in UTC format
const toUTCDate = (localDate: Date) =>
  new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
    ),
  );

// Gets all user attributes levels
const getAllUserAttrLvls = function (allAttributes: Attribute[]) {
  // Split every attribute per owner
  const everyUserAttributes: AttributesLvlsPerUser[] = [];

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
    let entry = everyUserAttributes.find((user) => user.userId === userId);

    // If no entry then create an object for user id and attribute level
    if (!entry) {
      entry = { userId, attributeLevels: [] };
      everyUserAttributes.push(entry);
    }

    // Push attribute level in the already initialized array
    entry.attributeLevels.push(level);
  }

  return everyUserAttributes;
};

// Determines whether a new level up is required
const isLevelUpRequired = (
  remainingXpToDistribute: number,
  xpToNext: number,
): boolean => remainingXpToDistribute >= xpToNext;

// Calculates how much XP is needed to go from current level to next level for an ATTRIBUTE
export function calculateNextLevelThreshold(level: number): number {
  const base = 100; // XP needed to go from level 1 to 2
  const scale = NEW_ATTR_LEVEL_XP_COST_SCALING; // each new level increases the requirement by 20%

  // level 1 -> 100
  // level 2 -> 120
  // level 3 -> 140
  const cost = base * (1 + (level - 1) * scale);
  return Math.round(cost);
}

// --- GENERAL CRUD METHODS ---

// Inserts new attribute in the attributes table given the params from the request body and user's id from the JWT token
export const createNewAttributeModel = async (newAttributeData: {
  initialXpToNext: number;
  attributeObj: Attribute;
}): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "INSERT INTO attributes (name, description, icon, users_id, xp_to_next_level) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      newAttributeData.attributeObj.name,
      newAttributeData.attributeObj.description,
      newAttributeData.attributeObj.icon,
      newAttributeData.attributeObj.users_id,
      newAttributeData.initialXpToNext,
    ],
  );
  return result.rows[0] ?? null;
};

// Gets a specific attribute by its id
export const getAttributeByIdModel = async (
  id: number,
): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "SELECT * FROM attributes WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
};

// Gets all attributes
const getAllAttributes = async (): Promise<Attribute[] | null> => {
  const result = await pool.query<Attribute>(`SELECT * FROM attributes`);
  return result.rows.length ? result.rows : null;
};

// Gets all user attributes by user id
export const getAttributesByUserIdModel = async (
  userId: number,
): Promise<Attribute[] | null> => {
  const result = await pool.query<Attribute>(
    `SELECT
    attributes.id,
    attributes.users_id,
    attributes.name,
    attributes.description,
    attributes.level,
    attributes.icon,
    attributes.xp,
    attributes.xp_to_next_level,
    attributes.decay_date
    FROM attributes
    JOIN users ON attributes.users_id = users.id
    WHERE attributes.users_id = $1`,
    [userId],
  );
  return result.rows.length ? result.rows : null;
};

// Deletes a specific attribute by id
export const deleteAttributeModel = async (
  id: number,
): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "DELETE FROM attributes WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0] ?? null;
};

// Updates a specific attribute by id
export const updateAttributeService = async (
  id: number,
  name?: string,
  description?: string,
  level?: number,
  xp?: number,
): Promise<Attribute | null> => {
  const { query, values } = updateRow(
    "attributes",
    id,
    {
      name,
      description,
      level,
      xp,
    },
    "No parameters for attribute update were provided",
  );

  const result = await pool.query<Attribute>(query, values);
  return result.rows[0] ?? null;
};

// --- BUSINESS LOGIC MODEL METHODS ---

// Gets all attributes involved in a specific quest
export const getAllAttributesToQuestService = async (
  questId: number,
): Promise<Attribute[] | null> => {
  const result = await pool.query<Attribute>(
    `SELECT 
    attributes.id,
    attributes.users_id,
    attributes.name,
    attributes.description,
    attributes.level,
    attributes.icon,
    attributes.xp,
    attributes.xp_to_next_level,
    attributes.decay_date
    FROM
    attributes
    JOIN quests_attributes ON attributes.id = quests_attributes.attributes_id
    JOIN quests ON quests_attributes.quests_id = quests.id
    WHERE
    quests_attributes.quests_id = $1`,
    [questId],
  );
  return result.rows.length ? result.rows : null;
};

// Assigns XP to attributes involved in a specific quest while completing it
export const assignXpToAttributesAndUserService = async (
  res: any,
  questId: number,
  questTotalXp: number,
  userId: number,
): Promise<void> => {
  // Get all user's attributes related to the quest to be completed
  const userAttrsToBeComQuest = await getAllAttributesToQuestService(questId);

  if (!userAttrsToBeComQuest) {
    return handleResponse(
      res,
      404,
      "User attributes linked to quest to be completed couldn't be found",
    );
  }

  // XP per attribute (even split)
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
    let xpToNext = attr.xp_to_next_level ?? calculateNextLevelThreshold(level);

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
      xpToNext = calculateNextLevelThreshold(level);
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
    await pool.query(
      `UPDATE attributes
       SET level = $1,
           xp = $2,
           xp_to_next_level = $3
       WHERE id = $4`,
      [level, xp, xpToNext, attr.id],
    );
    console.log(`--- ATTRIBUTE ITERATION ${attr.name.toUpperCase()} END ---`);
  }

  console.log("------ ATTRIBUTES FOR OF LOOP END ------");

  // Get all user's attributes
  const userAttributes = await getAttributesByUserIdService(userId);

  // Initialize array which will contain each user attribute's level
  const userAttributesLvls: number[] = [];

  // Push each user attribute's level into the newly initialized array
  userAttributes?.forEach((attr: Attribute) =>
    userAttributesLvls.push(attr.level as number),
  );

  // Calculate new user level after quest was completed
  const newUserLvl = calculateUserLvl(userAttributesLvls);

  // Assign new user level to that specific user
  const userToLevelUp = await assignNewUserLvlService(userId, newUserLvl);
  console.log(`userToLevelUp: ${userToLevelUp}`);

  // If user to level up wasn't found then returns an error message
  if (!userToLevelUp)
    return handleResponse(res, 404, "User to level up could not be found");
  console.log(`newUserLvl: ${newUserLvl}`);
};

// Assigns starting decay date to all attributes with xp
const assignStartingDecayDateToAttributeService = async (
  id: number,
  startingDecayDate: number,
): Promise<Attribute | null> => {
  const result = await pool.query<Attribute>(
    "UPDATE attrtibutes SET decay_date = $2, WHERE id = $1 RETURNING *",
    [id, startingDecayDate],
  );
  return result.rows[0] ?? null;
};

// Assigns a decay date if the attribute has no decays date and the attribute actually has xp
const assignStartingDecayDateToAttribute = async () => {
  // Get all attributes
  const allAttributes = await getAllAttributes();

  // Handling case in which allAttributes is null
  if (!allAttributes) return new Error("Attributes could not be fetched");

  // Checking if at least an attribute hasn't got a decay date and has xp
  const hasXpAndNotDecayDate: boolean = allAttributes.some(
    (attr) =>
      !attr.decay_date &&
      attr.xp !== null &&
      attr.xp > 0 &&
      attr.level !== null &&
      attr.level >= 1,
  );

  // If no attributes have xp nor a decay date then stop execution
  if (!hasXpAndNotDecayDate) return;

  // Otherwise loop over the attributes and set the default decay date for whichever is the case

  // Calculate today's UTC date
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  // Calculate starting decay date
  const startingDecayDate = todayUTC.setUTCDate(
    todayUTC.getUTCDate() + STARTING_GRACE_PERIOD_IN_DAYS,
  );

  // Looping over all attributes
  for (const attribute of allAttributes) {
    if (attribute.xp !== null && attribute.xp < 1) continue;
    else
      await assignStartingDecayDateToAttributeService(
        attribute.id,
        startingDecayDate,
      );
  }
};

// Compares dates and performs attributes decay
const decayAttributes = async () => {
  const allAttributes = await getAllAttributes();
  if (!allAttributes) return new Error("No attribute exists");

  if (!isDecayApplicable(allAttributes)) return;

  const allUserAttrLvls = getAllUserAttrLvls(allAttributes);
  if (!allUserAttrLvls) return new Error("No user attribute level exists");

  const todayStr = toUTCDate(new Date()).toISOString().slice(0, 10);

  for (const attribute of allAttributes) {
    if (!attribute.decay_date) continue;

    const decayStr = attribute.decay_date
      ? attribute.decay_date.toISOString().slice(0, 10)
      : null;

    // 1) Solo se oggi è il giorno di decay per questo attributo
    if (!decayStr || decayStr !== todayStr) continue;

    // 2) Trova i livelli di TUTTI gli attributi di questo utente
    const correspondingUserAttrLvls = allUserAttrLvls.find(
      (attr) => attr.userId === attribute.users_id,
    );
    if (!correspondingUserAttrLvls)
      return new Error("No corresponding user attribute level exists");

    const userBuildMultiplier = overallAttributesMultiplier(
      correspondingUserAttrLvls.attributeLevels,
    );

    // 3) Calcola quanta XP perdere
    const xpToNext =
      attribute.xp_to_next_level ??
      calculateNextLevelThreshold(attribute.level ?? 1);

    const loss = calculateDecayLoss(xpToNext, userBuildMultiplier);

    // 4) Applica il decay a questo attributo
    const current: AttributeProgress = {
      level: attribute.level ?? 1,
      xp: attribute.xp ?? 0,
      xp_to_next_level: xpToNext,
    };

    const updated = applyDecayToAttribute(current, loss);

    // 5) Persisti
    await pool.query(
      `UPDATE attributes
       SET level = $1,
           xp = $2,
           xp_to_next_level = $3
       WHERE id = $4`,
      [updated.level, updated.xp, updated.xp_to_next_level, attribute.id],
    );

    // 6) (opzionale) ricalcola la nuova decay_date, es. riparti dal grace period
    const newDecayDate = toUTCDate(new Date());
    newDecayDate.setUTCDate(
      newDecayDate.getUTCDate() + STARTING_GRACE_PERIOD_IN_DAYS,
    );

    await pool.query(
      `UPDATE attributes
       SET decay_date = $1
       WHERE id = $2`,
      [newDecayDate, attribute.id],
    );
  }
};
