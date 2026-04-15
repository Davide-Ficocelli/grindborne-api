import { Router, type RequestHandler } from "express";
import { validateNewQuest } from "../middlewares/inputValidators.ts";
import { authenticateToken } from "../controllers/authController.ts";
import { createNewQuest } from "../controllers/questsController.ts";

const router = Router();

// Route for new quest creation
router.post(
  "/quests",
  authenticateToken,
  validateNewQuest,
  createNewQuest as RequestHandler,
);

export default router;
