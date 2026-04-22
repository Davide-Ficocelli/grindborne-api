import handleResponse from "../utils/handleResponse.ts";
import {
  createNewQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
  updateQuestService,
  deleteQuestService,
  trackQuestService,
  addAttributesToQuestService,
} from "../models/questsModel.ts";

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
  console.log("createNewQuest CALLED!!!");
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
      }

      // Sends back a successfull response, status code and message if the new quest is created with no issues
      handleResponse(res, 201, "Quest created successfully", questToReturn);
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
