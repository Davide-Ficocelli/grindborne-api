import handleResponse from "../utils/handleResponse.ts";
import {
  createNewQuestService,
  getQuestByIdService,
  getQuestsByUserIdService,
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

      // Starts the attribute creation process with the appropriate async function created in the attributesModel.ts file
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

      // Sends back a successfull response, status code and message if the new attribute is created with no issues
      handleResponse(res, 201, "Quest created successfully", newQuest);
    } catch (err) {
      next(err);
    }
  }
};
