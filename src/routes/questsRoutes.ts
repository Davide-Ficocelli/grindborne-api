import { Router, type RequestHandler } from "express";
import {
  validateNewQuest,
  validateUpdatedQuest,
} from "../middlewares/inputValidators.ts";
import { authenticateToken } from "../controllers/authController.ts";
import {
  createNewQuest,
  getQuestById,
  getQuestsByUserId,
  updateQuest,
} from "../controllers/questsController.ts";

const router = Router();

// Route to get all user's quests
router.get("/quests", authenticateToken, getQuestsByUserId as RequestHandler);

// Route to get a specific quest by its id
router.get("/quests/:id", authenticateToken, getQuestById);

// Route to update an existing quest
router.put("/quests/:id", authenticateToken, validateUpdatedQuest, updateQuest);

// Route for new quest creation
router.post(
  "/quests",
  authenticateToken,
  validateNewQuest,
  createNewQuest as RequestHandler,
);

export default router;
