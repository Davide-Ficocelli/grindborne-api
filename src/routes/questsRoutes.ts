import { Router, type RequestHandler } from "express";
import { validateNewQuest } from "../middlewares/inputValidators.ts";
import { authenticateToken } from "../controllers/authController.ts";
import {
  createNewQuest,
  getQuestById,
  getQuestsByUserId,
} from "../controllers/questsController.ts";

const router = Router();

// Route for getting all user's quests
router.get("/quests", authenticateToken, getQuestsByUserId as RequestHandler);

// Route for getting a specific quest by its id
router.get("/quests/:id", authenticateToken, getQuestById);

// Route for new quest creation
router.post(
  "/quests",
  authenticateToken,
  validateNewQuest,
  createNewQuest as RequestHandler,
);

export default router;
