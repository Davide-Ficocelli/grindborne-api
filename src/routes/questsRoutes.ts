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
  deleteQuest,
  trackQuest,
  completeQuest,
} from "../controllers/questsController.ts";

const router = Router();

// --- GENERAL CRUD ENDPOINTS ---

// Route to get all user's quests
router.get("/quests", authenticateToken, getQuestsByUserId as RequestHandler);

// Route to get a specific quest by its id
router.get("/quests/:id", authenticateToken, getQuestById);

// Route to update an existing quest
router.put("/quests/:id", authenticateToken, validateUpdatedQuest, updateQuest);

// Route to delete an existing quest
router.delete("/quests/:id", authenticateToken, deleteQuest);

// Route for new quest creation
router.post(
  "/quests",
  authenticateToken,
  validateNewQuest,
  createNewQuest as RequestHandler,
);

// --- BUSINESS LOGIC ENDPOINTS ---

// Route to start tracking a quest
router.patch("/quests/:id/track", authenticateToken, trackQuest);

// Route to complete a quest
router.patch(
  "/quests/:id/complete",
  authenticateToken,
  completeQuest as RequestHandler,
);

export default router;
