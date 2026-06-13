// Importing types
import type ServiceValidation from "../types/serviceValidation.ts";
import { type AttributeInDatabase } from "../types/attribute.ts";

// Importing global variables
import {
  REQUIRED_AVG_ATTR_LVLS_FOR_BUILD_SCALING,
  ESTIMATED_TIME_BREAKPOINTS,
  AVG_QUEST_LVL_UP_WORTH,
} from "../config/globals.ts";

// Importing types
import {
  type NewQuest,
  type QuestInDb,
  type UpdatedQuest,
} from "../types/quest.ts";

// Importing functions
import preventIdor from "../utils/preventIdor.ts";
import {
  getQuestByIdModel,
  getQuestsByUserIdModel,
  updateQuestModel,
  createNewQuestModel,
  addAttributesToQuestModel,
  trackQuestModel,
  deleteQuestModel,
} from "../models/questsModel.ts";
import { assignXpToAttrsAndUserService } from "../services/attributesService.ts";
import { getUserByIdModel } from "../models/usersModel.ts";
import {
  getAttributesByUserIdService,
  getAllAttributesToQuestService,
} from "../services/attributesService.ts";
import {
  calculateDatesDiff,
  calculateQuestTotalXP,
  validateQuestToBeCompleted,
  type DataForXp,
} from "../shared/questsHelpers.ts";

// File index

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

// Gets quest by its quest
export const getQuestByIdService = async (
  questId: number,
  userId: number,
): Promise<ServiceValidation> => {
  // Get quest by id
  const quest = await getQuestByIdModel(questId);

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
    return { ok: false, status: 404, message: "Quests not found" };

  // Prevent IDOR
  const { isIdorDetected, status, message } = preventIdor(
    userId,
    (userQuests[0] as QuestInDb)?.users_id,
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

// Updates a quest
export const updateQuestService = async (
  questId: number,
  userId: number,
  updatedQuestProps: UpdatedQuest,
): Promise<ServiceValidation> => {
  // Get the quest to be updated first
  const questToBeUpdated = await getQuestByIdModel(questId);

  // Handle case in which the quest to be updated is null
  if (!questToBeUpdated)
    return {
      ok: false,
      status: 404,
      message: "Quest to be updated not found",
    };

  // Get quest owner id
  const questOwnerId = questToBeUpdated.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    questOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Do not allow quest update if the quest is being tracked and it's not completed
  if (!questToBeUpdated.is_completed && questToBeUpdated.is_tracked)
    return {
      ok: false,
      status: 400,
      message: "Unable to update quest, quest is being tracked",
    };

  // Do not allow quest update if the quest has been previously completed
  if (questToBeUpdated.is_completed)
    return {
      ok: false,
      status: 400,
      message: "Unable to update quest, quest is completed",
    };

  // Update quest and save the result
  const updatedQuest = await updateQuestModel(questId, updatedQuestProps);

  // Handling case in which updated quest is null
  if (!updatedQuest)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while updating the quest",
    };

  // Return successful state
  return {
    ok: true,
    status: 200,
    message: "Quest updated successfully",
    data: updatedQuest,
  };
};

// Deletes a quest
export const deleteQuestService = async (
  questId: number,
  userId: number,
): Promise<ServiceValidation> => {
  // Get the quest to be deleted first
  const questToBeDeleted = await getQuestByIdModel(questId);

  // Handle case in which the quest to be deleted is null
  if (!questToBeDeleted)
    return {
      ok: false,
      status: 404,
      message: "Quest to be deleted not found",
    };

  // Get quest owner id
  const questOwnerId = questToBeDeleted?.users_id;

  // Prevent IDOR

  const { isIdorDetected, status, message } = preventIdor(
    userId,
    questOwnerId as number,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Delete the quest and save the result
  const deletedQuest = await deleteQuestModel(questId);

  // Handling case in which deleted quest is null
  if (!deletedQuest)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while deleting the quest",
    };

  // Delete the quest and return it
  return {
    ok: true,
    status: 200,
    message: "Quest deleted successfully",
    data: deletedQuest,
  };
};

// Creates a new quest
export const createNewQuestService = async (
  attributes_ids: number[],
  isTracked: boolean,
  questObj: NewQuest,
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

  if (!newQuest)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while creating a new quest",
    };

  // If the client asked to track the quest upon creation then it's done now
  let questToReturn = newQuest;

  if (isTracked) {
    const trackedQuest = await trackQuestService(
      (newQuest as QuestInDb).id,
      (newQuest as QuestInDb).users_id,
    );
    if (!trackedQuest.ok)
      return {
        ok: trackedQuest.ok,
        status: trackedQuest.status,
        message: trackedQuest.message,
        data: trackedQuest.data,
      };
    questToReturn = trackedQuest.data as QuestInDb;
  }

  // Populates the join table quests_attributes with both quests and attributes' ids
  const { ok, status, message } = await addAttributesToQuestService(
    (newQuest as QuestInDb).id,
    attributes_ids,
  );

  // Stop execution and return error message if something went wrong
  if (!ok) return { ok, status, message };

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

// Tracks an existing quest
export const trackQuestService = async (questId: number, userId: number) => {
  // Get quest to be tracked by its id
  const questToBeTracked = await getQuestByIdModel(questId);

  // If quest wasn't found return an error message
  if (!questToBeTracked)
    return { ok: false, status: 404, message: "Quest to be tracked not found" };

  // Prevent IDOR
  const { isIdorDetected, status, message } = preventIdor(
    userId,
    questToBeTracked.users_id,
  );

  if (isIdorDetected)
    return { ok: false, status: status ?? 0, message: message ?? "" };

  // Do not allow quest tracking if this is already completed
  if (questToBeTracked.is_completed)
    return {
      ok: false,
      status: 400,
      message: "Unable to track quest, quest is completed",
      data: questToBeTracked,
    };

  // Do not allow quest tracking if this is already being tracked
  if (questToBeTracked.is_tracked)
    return {
      ok: false,
      status: 400,
      message: "Unable to track quest, quest is already being tracked",
      data: questToBeTracked,
    };

  // Flag the quest as tracked in the database
  const trackedQuest = await trackQuestModel(questId);

  // Handle case in which tracked quest is null
  if (!trackedQuest)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while trying to track thr quest",
    };

  // If everything went well then return a successfull response along with the data
  return {
    ok: true,
    status: 200,
    message: "Quest tracked successfully",
    data: trackedQuest,
  };
};

// Adds attributes to a specific quest upon creation
const addAttributesToQuestService = async function (
  questId: number,
  attributes_ids: number[],
): Promise<ServiceValidation> {
  if (!attributes_ids || attributes_ids.length === 0)
    return {
      ok: false,
      status: 400,
      message: "Invalid attributes were provided",
    };

  // Let's build a multi-valued query: INSERT INTO quest_attributes(quest_id, attribute_id) VALUES ($1, $2),...
  const values: any[] = [];
  const valuePlaceholders: string[] = [];

  attributes_ids.forEach((attrId, idx) => {
    // for each pair quest/attribute we add two parameters
    const baseIndex = idx * 2;
    valuePlaceholders.push(`($${baseIndex + 1}, $${baseIndex + 2})`);
    values.push(questId, attrId);
  });

  // Perform the true attributes addition operation
  const addedAttr = await addAttributesToQuestModel(valuePlaceholders, values);

  // Prevent attribute addition to quest from failing silently
  if (!addedAttr)
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while adding attributes to quest",
    };

  // Return a successful result if everything went well
  return {
    ok: true,
    status: 201,
    message: "Attributes were added to quest successfully",
  };
};

// Completes a quest
export const completeQuestService = async (
  questId: number,
  userId: number,
): Promise<ServiceValidation> => {
  // Get quest to be completed
  const questToBeCompleted = await getQuestByIdModel(questId);

  // If quest to be completed wasn't found then stop execution
  if (!questToBeCompleted)
    return {
      ok: false,
      status: 404,
      message: "Quest to be completed was not found",
    };

  // Get quest validation results
  const { ok, status, message, data } = await validateQuestToBeCompleted(
    questToBeCompleted,
    userId,
  );

  // If quest validation failed then stop execution
  if (!ok) return { ok, status: status ?? 0, message: message ?? "" };

  // Get quest's is_rewardable and estimated_time value
  const { is_rewardable, estimated_time, tracked_at } = questToBeCompleted;

  // Validate quest
  let result;
  // If is not rewardable then just mark the quest as completed and stop the tracking
  if (!is_rewardable) {
    result = await updateQuestModel(questId, {
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

    // Get necessary data for total xp reward calculation
    const { userLevel, attributesToQuestLvls, userAttributesLvls } =
      data as DataForXp;

    // Handle case in which one of the pieces of data is null
    if (!userLevel || !attributesToQuestLvls || !userAttributesLvls)
      return {
        ok: false,
        status: 500,
        message: "Something went wrong while determining xp",
      };

    // Calculate total xp reward for quest
    const questTotalXp: number = calculateQuestTotalXP(
      userLevel,
      attributesToQuestLvls,
      userAttributesLvls,
      estimated_time as number,
      actual_time,
    );

    // Assign xp to involved attributes in the quest
    const {
      ok,
      status,
      message,
      data: userData,
    } = await assignXpToAttrsAndUserService(questId, questTotalXp, userId);

    // If xp assig went wrong stop execution
    if (!ok) return { ok, status, message };

    // Update the quest data accordingly
    result = await updateQuestModel(questId, {
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
