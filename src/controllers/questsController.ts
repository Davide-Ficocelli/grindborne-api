import handleResponse from "../utils/handleResponse.ts";
import {
  updateQuestModel,
  deleteQuestService,
  trackQuestService,
} from "../models/questsModel.ts";
import {
  completeQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
  createNewQuestService,
} from "../services/questsService.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/auth.ts";
import { type Quest } from "../types/quest.ts";

// File's index

/*
|
| --- GENERAL CRUD CONTROLLER FUNCTIONS ---
|
| --- BUSINESS LOGIC CONTROLLER FUNCTIONS ---
|
*/

// --- GENERAL CRUD CONTROLLER FUNCTIONS ---

// Returns a quest by its id
export const getQuestByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get user id
    const userId = req.user.id;
    // Get quest
    const quest = await getQuestByIdService(Number(req.params.id), userId);

    // Get and return service validation results
    const { ok, status, message, data } = quest;

    // return response validation results
    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Returns all of the corrispective user's quests
export const getQuestsByUserIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Gets user id
    const userId = req.user.id;

    // Retrieves and saves all user's quests
    const userQuests = await getQuestsByUserIdService(userId);

    // Get and return service validation results
    const { ok, status, message, data } = userQuests;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// --- Helper functions for CreateNewQuestController ---

// Creates a new quest
export const createNewQuestController = async (
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

      // Gets user's id for users_id field
      const userId: number = req.user.id;

      // Starts the quest creation process with the appropriate async function created in the questsModel.ts file
      const newQuest = await createNewQuestService(attributes_ids, {
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
    const updatedQuest = await updateQuestModel(Number(req.params.id), {
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
    const questToTrack = await getQuestByIdModel(Number(req.params.id));

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
    handleResponse(res, 200, "Quest successfully tracked", trackedQuest);
  } catch (err) {
    next(err);
  }
};

// Completes a quest
export const completeQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get user id needed to identify the quest's owner
    const userId = req.user.id;

    // Get quest id
    const questId = Number(req.params.id);

    // Pass down the quest id from parameters and the user's level in the service function
    const completedQuest = await completeQuestService(questId, userId);

    const { ok, status, message, data } = completedQuest;

    // Return results
    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};
