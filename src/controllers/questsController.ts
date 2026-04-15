import handleResponse from "../utils/handleResponse.ts";
import { createNewQuestService } from "../models/questsModel.ts";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthPayload, type AuthRequest } from "../types/auth.ts";

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
