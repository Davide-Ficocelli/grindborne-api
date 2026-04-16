import handleResponse from "../utils/handleResponse.ts";
import {
  createNewQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
  updateQuestService,
  deleteQuestService,
} from "../models/questsModel.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthPayload, type AuthRequest } from "../types/auth.ts";

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
        totalXp,
        isRewardable,
        isTracked,
        trackedAt,
        isCompleted,
        completedAt,
        estimatedTime,
        actualTime,
      } = req.body;

      // Gets user's id for users_id field
      const userId: number = req.user.id;

      // Starts the quest creation process with the appropriate async function created in the questsModel.ts file
      const newQuest = await createNewQuestService({
        usersId: userId,
        name,
        description,
        icon,
        totalXp,
        isRewardable,
        isTracked,
        trackedAt,
        isCompleted,
        completedAt,
        estimatedTime,
        actualTime,
      });

      // Sends back a successfull response, status code and message if the new quest is created with no issues
      handleResponse(res, 201, "Quest created successfully", newQuest);
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
      totalXp,
      isRewardable,
      isTracked,
      trackedAt,
      isCompleted,
      completedAt,
      estimatedTime,
      actualTime,
    } = req.body;

    // Pass down parameters for new quest's values
    const updatedQuest = await updateQuestService({
      id: Number(req.params.id),
      name,
      description,
      icon,
      totalXp,
      isRewardable,
      isTracked,
      trackedAt,
      isCompleted,
      completedAt,
      estimatedTime,
      actualTime,
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
