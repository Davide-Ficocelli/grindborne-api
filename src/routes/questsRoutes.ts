import { Router, type RequestHandler } from "express";
import {
  validateNewQuest,
  validateUpdatedQuest,
} from "../middlewares/inputValidators.ts";
import { authenticateToken } from "../controllers/authController.ts";
import {
  createNewQuestController,
  getQuestByIdController,
  getQuestsByUserIdController,
  updateQuestController,
  deleteQuestController,
  trackQuestController,
  completeQuestController,
} from "../controllers/questsController.ts";

const router = Router();

// --- GENERAL CRUD ENDPOINTS ---

// Route to get all user's quests
router.get(
  "/quests",
  authenticateToken,
  getQuestsByUserIdController as RequestHandler,
);

// Route to get a specific quest by its id
router.get(
  "/quests/:id",
  authenticateToken,
  getQuestByIdController as RequestHandler,
);

// Route to update an existing quest
router.put(
  "/quests/:id",
  authenticateToken,
  validateUpdatedQuest,
  updateQuestController as RequestHandler,
);

// Route to delete an existing quest
router.delete(
  "/quests/:id",
  authenticateToken,
  deleteQuestController as RequestHandler,
);

// Route for new quest creation
router.post(
  "/quests",
  authenticateToken,
  validateNewQuest,
  createNewQuestController as RequestHandler,
);

// --- BUSINESS LOGIC ENDPOINTS ---

// Route to start tracking a quest
router.patch(
  "/quests/:id/track",
  authenticateToken,
  trackQuestController as RequestHandler,
);

// Route to complete a quest
router.patch(
  "/quests/:id/complete",
  authenticateToken,
  completeQuestController as RequestHandler,
);

export default router;
