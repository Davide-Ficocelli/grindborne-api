import handleResponse from "../utils/handleResponse.ts";
import {
  createNewQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
  updateQuestService,
  deleteQuestService,
  trackQuestService,
  addAttributesToQuestService,
  completeQuestService,
} from "../models/questsModel.ts";
import { getUserByIdService } from "../models/usersModel.ts";
import {
  getAllAttributesToQuest,
  getAttributesByUserIdService,
} from "../models/attributesModel.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthPayload, type AuthRequest } from "../types/auth.ts";
import { type NewQuestInput, type Quest } from "../types/quest.ts";

// --- HELPER FUNCTIONS ---

// Validates request for new quest according to business requirements
const validateNewQuestReq = function (
  res: any,
  is_rewardable: boolean,
  attributes_ids: number[],
  estimated_time: number,
): {
  isValid: boolean;
  response: void | null;
} {
  // Check if it's rewardable and then proceed with the other checks accordingly
  if (is_rewardable) {
    // If attributes_id is either not an array or an empty one stop execution
    if (!Array.isArray(attributes_ids) || attributes_ids.length === 0)
      return {
        isValid: false,
        response: handleResponse(
          res,
          400,
          "Rewardable quests must have at least one attribute id",
        ),
      };
    // If there's no estimated time, stop execution
    else if (!estimated_time)
      return {
        isValid: false,
        response: handleResponse(
          res,
          400,
          "Rewardable quests must have an estimated time",
        ),
      };
    // if not rewardable, there must be NO attributes
  } else if (
    !is_rewardable &&
    Array.isArray(attributes_ids) &&
    attributes_ids.length > 0
  )
    return {
      isValid: false,
      response: handleResponse(
        res,
        400,
        "Non-rewardable quests cannot have attributes",
      ),
    };

  return { isValid: true, response: null };
};

type CompletedQuestValidationResult =
  | {
      ok: true;
      userLevel: number;
      userAttributesLvls: number[];
      attributesToQuestLvls: number[];
    }
  | {
      ok: false;
    };

// Validates all checks before completing a quest and returns all values needed to calculate the total xp reward
const validateCompletedQuest = async function (
  res: any,
  userId: number,
  questId: number,
): Promise<CompletedQuestValidationResult> {
  // Find the authenticated user
  const user = await getUserByIdService(userId);
  if (!user) {
    handleResponse(res, 404, "Authenticated user could not be found");
    return { ok: false };
  }

  // Getting user's quest to be completed
  const userQuestToComplete = await getQuestByIdService(questId);

  // If user's quest to be completed could not be found then stop execution returning an error message
  if (!userQuestToComplete) {
    handleResponse(res, 404, "Quest to be completed could not be found");
    return { ok: false };
  }

  // Do not allow quest completion if quest to be completed has already been completed
  if (userQuestToComplete.is_completed) {
    handleResponse(
      res,
      400,
      "Cannot complete a quest that is already completed",
    );
    return { ok: false };
  }

  // Do not allow quest completion if quest to be completed is not being tracked
  if (!userQuestToComplete.is_tracked) {
    handleResponse(
      res,
      400,
      "Cannot complete an untracked quest. Only tracked quests can be completed",
    );
    return { ok: false };
  }

  // Compare authenticated user's id with users_id registered upon quest creation
  // If authenticated user's id and registered user's id do not match then stop execution returning an error message
  if (user.id !== (userQuestToComplete as Quest).users_id) {
    handleResponse(
      res,
      403,
      "Quest owner does not match with authenticated user",
    );
    return { ok: false };
  }

  // Get all user's attributes
  const userAttributes = await getAttributesByUserIdService(userId);

  // If authenticated user's attributes could not be found then stop execution returning an error message
  if (!userAttributes) {
    handleResponse(
      res,
      404,
      "Authenticated user's attributes could not be found",
    );
    return { ok: false };
  }

  /*
    Compare authenticated user's id with registered users_id upon attributes creation.
    If at least one attribute among the ones owned by the user has a users_id value not matching with authenticated user's id
    then stop execution returning an error message
  */
  if (userAttributes.some((attr) => attr.users_id !== userId)) {
    handleResponse(
      res,
      403,
      "Attributes' owner and authenticated user do not match",
    );
    return { ok: false };
  }

  // Get all user's attributes involved in the quest to be completed by using the id passed in the params
  const attributesToBeComQuest = await getAllAttributesToQuest(questId);

  // If attributes could not be found then stop execution returning an error message
  if (!attributesToBeComQuest) {
    handleResponse(
      res,
      404,
      "Attributes involved in quest to be completed could not be found",
    );
    return { ok: false };
  }

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

// --- GENERAL CRUD CONTROLLER FUNCTIONS ---

// Returns a quest by its id
export const getQuestById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quest = await getQuestByIdService(Number(req.params.id));
    if (!quest) return handleResponse(res, 404, "Quest not found");
    handleResponse(res, 200, "Quest fetched successfully", quest);
  } catch (err) {
    next(err);
  }
};

// Returns all of the corrispective user's quests
export const getQuestsByUserId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Gets user id
    const userId = req.user.id;

    // Retrieves and saves all user's quests
    const userQuests = await getQuestsByUserIdService(userId);

    // If no quests are returned send back an error message
    if (!userQuests)
      return handleResponse(res, 404, "No quests were found for this user");

    // Return quests if no issues occured
    handleResponse(
      res,
      200,
      "All user quests successfully retrieved",
      userQuests,
    );
  } catch (err) {
    next(err);
  }
};

// Creates a new quest
export const createNewQuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  {
    try {
      // Gets the input fields which will be inserted in the quests table for the new record from the request body
      const {
        name,
        description,
        icon,
        total_xp,
        is_rewardable,
        is_tracked,
        tracked_at,
        is_completed,
        completed_at,
        estimated_time,
        actual_time,
        attributes_ids,
      } = req.body;

      // Request validation
      const { isValid, response } = validateNewQuestReq(
        res,
        is_rewardable,
        attributes_ids,
        estimated_time,
      );

      // Check if the request is valid, if not stop execution and sends back a response
      if (isValid === false) return response;

      // Gets user's id for users_id field
      const userId: number = req.user.id;

      // Starts the quest creation process with the appropriate async function created in the questsModel.ts file
      const newQuest = await createNewQuestService({
        users_id: userId,
        name,
        description,
        icon,
        total_xp,
        is_rewardable,
        is_tracked,
        tracked_at,
        is_completed,
        completed_at,
        estimated_time,
        actual_time,
      });

      // Sends an error message if quest could not be created
      if (!newQuest)
        return handleResponse(res, 500, "Quest could not be created");

      // Populates the join table quests_attributes with both quests and attributes' ids
      await addAttributesToQuestService((newQuest as Quest).id, attributes_ids);

      // If the client asked to track the quest upon creation then it's done now
      let questToReturn = newQuest;

      if (is_tracked) {
        const trackedQuest = await trackQuestService((newQuest as Quest).id);
        if (trackedQuest) questToReturn = trackedQuest;
        else return handleResponse(res, 500, "Quest could not be tracked");
      }

      // Sends back a successfull response, status code and message if the new quest is created with no issues
      handleResponse(res, 201, "Quest successfully created", questToReturn);
    } catch (err) {
      next(err);
    }
  }
};

// Updates a quest
export const updateQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Extract all data from the request body
    const {
      name,
      description,
      icon,
      total_xp,
      is_rewardable,
      is_tracked,
      tracked_at,
      is_completed,
      completed_at,
      estimated_time,
      actual_time,
    } = req.body;

    // Pass down parameters for new quest's values
    const updatedQuest = await updateQuestService(Number(req.params.id), {
      name,
      description,
      icon,
      total_xp,
      is_rewardable,
      is_tracked,
      tracked_at,
      is_completed,
      completed_at,
      estimated_time,
      actual_time,
    });
    // Sends back an error status code if a quest wasn't found
    if (!updatedQuest) return handleResponse(res, 404, "Quest not found");

    // Sends back a successfull status code if the quest was updated successfully
    handleResponse(res, 200, "Quest updated successfully", updatedQuest);
  } catch (err) {
    next(err);
  }
};

// Deletes a quest
export const deleteQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const deletedQuest = await deleteQuestService(Number(req.params.id));
    if (!deletedQuest) return handleResponse(res, 404, "Quest not found");
    handleResponse(res, 200, "Quest deleted successfully", deletedQuest);
  } catch (err) {
    next(err);
  }
};

// --- BUSINESS LOGIC CONTROLLER FUNCTIONS ---

// Tracks a quest
export const trackQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get quest to track
    const questToTrack = await getQuestByIdService(Number(req.params.id));

    // If quest to be tracked wasn't found then return an error
    if (!questToTrack)
      return handleResponse(res, 404, "Couldn't find quest to be tracked");

    // Do not allow tracking if quest has already been completed
    if (questToTrack?.is_completed)
      return handleResponse(res, 400, "Cannot track completed quest");

    // Pass down the quest id from parameters in the service function
    const trackedQuest = await trackQuestService(Number(req.params.id));

    // If tracked quest wasn't found then sends back an error message
    if (!trackedQuest)
      return handleResponse(res, 404, "Tracked quest not found");

    // If everything went well then sends back a successful message
    handleResponse(res, 201, "Quest successfully tracked", trackedQuest);
  } catch (err) {
    next(err);
  }
};

// Completes a quest
export const completeQuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get user id needed to identify the quest's owner
    const userId = req.user.id;

    // Get quest id
    const questId = Number(req.params.id);

    const validation = await validateCompletedQuest(res, userId, questId);
    if (!validation.ok) return; // the API response has already been sent inside the helper function

    const { userLevel, userAttributesLvls, attributesToQuestLvls } = validation;

    // Pass down the quest id from parameters and the user's level in the service function
    const completedQuest = await completeQuestService(
      res,
      questId,
      userLevel,
      userAttributesLvls,
      attributesToQuestLvls,
    );

    // If completed quest could not be found then sends back an error message
    if (!completedQuest)
      return handleResponse(res, 404, "Completed quest could not be found");

    // If everything went well then sends back a successful message
    handleResponse(res, 201, "Quest successfully completed", completedQuest);
  } catch (err) {
    next(err);
  }
};
