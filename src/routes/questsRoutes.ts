import { Router, type RequestHandler } from "express";
import {
  validateNewQuest,
  validateUpdatedQuest,
} from "../middlewares/inputValidators.js";
import { authenticateToken } from "../controllers/authController.js";
import {
  createNewQuestController,
  getQuestByIdController,
  getQuestsByUserIdController,
  updateQuestController,
  trackQuestController,
  completeQuestController,
  softDeleteQuestController,
  failQuestController,
} from "../controllers/questsController.js";

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

// Soft-deletes an existing quest
router.patch(
  "/quests/:id",
  authenticateToken,
  softDeleteQuestController as RequestHandler,
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

// Route to fail a quest
router.patch(
  "/quests/:id/fail",
  authenticateToken,
  failQuestController as RequestHandler,
);

export default router;
