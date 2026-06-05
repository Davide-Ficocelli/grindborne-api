import handleResponse from "../utils/handleResponse.ts";
import {
  completeQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
  createNewQuestService,
  deleteQuestService,
  trackQuestService,
  updateQuestService,
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
    // Get quest and user id
    const questId = Number(req.params.id);
    const userId = req.user.id;
    // Get quest
    const quest = await getQuestByIdService(questId, userId);

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
        is_rewardable,
        is_tracked,
        estimated_time,
        attributes_ids,
      } = req.body;

      // Gets user's id for users_id field
      const userId: number = req.user.id;

      // Starts the quest creation process with the appropriate async function created in the questsModel.ts file
      const newQuest = await createNewQuestService(attributes_ids, is_tracked, {
        users_id: userId,
        name,
        description,
        icon,
        is_rewardable,
        estimated_time,
      });

      // Get and return service results
      const { ok, status, message, data } = newQuest;

      return handleResponse(res, ok, status, message, data);
    } catch (err) {
      next(err);
    }
  }
};

// Updates a quest
export const updateQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Extract all data from the request body
    const { name, description, icon, is_rewardable, estimated_time } = req.body;

    // Get quest and user id
    const questId = Number(req.params.id);
    const userId = req.user.id;

    // Pass down parameters for new quest's values
    const updatedQuest = await updateQuestService(questId, userId, {
      name,
      description,
      icon,
      is_rewardable,
      estimated_time,
    });

    // Get and send back service results
    const { ok, status, message, data } = updatedQuest;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Deletes a quest
export const deleteQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get quest and user id
    const questId = Number(req.params.id);
    const userId = req.user.id;

    // Start the quest deletion process in the service
    const deletedQuest = await deleteQuestService(questId, userId);

    // Get and return service results

    const { ok, status, message, data } = deletedQuest;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// --- BUSINESS LOGIC CONTROLLER FUNCTIONS ---

// Tracks a quest
export const trackQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get quest and user id
    const questId = Number(req.params.id);
    const userId = req.user.id;

    // Start the quest tracking process
    const trackedQuest = await trackQuestService(questId, userId);

    // Get and return service results
    const { ok, status, message, data } = trackedQuest;

    return handleResponse(res, ok, status, message, data);
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
