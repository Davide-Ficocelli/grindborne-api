import processServiceRequest from "../utils/processServiceRequest.js";
import {
  completeQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
  createNewQuestService,
  trackQuestService,
  updateQuestService,
  softDeleteQuestService,
  failQuestService,
} from "../services/questsService.js";

// Importing types
import { type Response, type NextFunction } from "express";
import { type AuthRequest } from "../types/auth.js";

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
  // Get quest and user id
  const questId = req.params.id ? req.params.id.toString() : "";
  const userId = req.user.id;
  // Get quest
  return processServiceRequest(res, next, getQuestByIdService(questId, userId));
};

// Returns all of the corrispective user's quests
export const getQuestsByUserIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Gets user id
  const userId = req.user.id;

  // Retrieves and saves all user's quests
  return processServiceRequest(res, next, getQuestsByUserIdService(userId));
};

// Creates a new quest
export const createNewQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
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
  const userId: string = req.user.id;

  // Starts the quest creation process with the appropriate async function created in the questsModel.js file
  return processServiceRequest(
    res,
    next,
    createNewQuestService(attributes_ids, is_tracked, {
      users_id: userId,
      name,
      description,
      icon,
      is_rewardable,
      estimated_time,
    }),
  );
};

// Updates a quest
export const updateQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Extract all data from the request body
  const { name, description, icon, is_rewardable, estimated_time } = req.body;

  // Get quest and user id
  const questId = req.params.id ? req.params.id.toString() : "";
  const userId = req.user.id;

  // Pass down parameters for new quest's values
  return processServiceRequest(
    res,
    next,
    updateQuestService(questId, userId, {
      name,
      description,
      icon,
      is_rewardable,
      estimated_time,
    }),
  );
};

// Soft-deletes a quest
export const softDeleteQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const questId = req.params.id ? req.params.id.toString() : "";
  const userId = req.user.id;

  return processServiceRequest(
    res,
    next,
    softDeleteQuestService(questId, userId),
  );
};

// --- BUSINESS LOGIC CONTROLLER FUNCTIONS ---

// Tracks a quest
export const trackQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Get quest and user id
  const questId = req.params.id ? req.params.id.toString() : "";
  const userId = req.user.id;

  // Start the quest tracking process
  return processServiceRequest(res, next, trackQuestService(questId, userId));
};

// Completes a quest
export const completeQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Get user id needed to identify the quest's owner
  const userId = req.user.id;

  // Get quest id
  const questId = req.params.id ? req.params.id.toString() : "";

  // Pass down the quest id from parameters and the user's level in the service function
  return processServiceRequest(
    res,
    next,
    completeQuestService(questId, userId),
  );
};

// Fails a quest
export const failQuestController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Get quest and user id
  const questId = req.params.id ? req.params.id.toString() : "";
  const userId = req.user.id;

  // Start the quest failing process
  return processServiceRequest(res, next, failQuestService(questId, userId));
};
