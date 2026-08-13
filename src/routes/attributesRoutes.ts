import { Router, type RequestHandler } from "express";
import { authenticateToken } from "../controllers/authController.js";
import {
  createNewAttributeController,
  getAttributesByUserIdController,
  updateAttributeController,
  getAllAttributesToQuestController,
  softDeleteAttributeController,
} from "../controllers/attributesController.js";
import {
  validateNewAttribute,
  validateUpdatedAttribute,
} from "../middlewares/inputValidators.js";

// Initialize and export express router for attributes routes
const router = Router();

// // Endpoint for all user attributes fetching
router.get(
  "/attributes",
  authenticateToken,
  getAttributesByUserIdController as RequestHandler,
);

// Endpoint for user attribute creation
router.post(
  "/attributes",
  authenticateToken,
  validateNewAttribute,
  createNewAttributeController as RequestHandler,
);

// Soft-deletes an existing attribute
router.patch(
  "/attributes/:id",
  authenticateToken,
  softDeleteAttributeController as RequestHandler,
);

// Endpoint for user attribute update
// You must think very carefully about which fields the user will be able to update and which ones they won't
router.put(
  "/attributes/:id",
  authenticateToken,
  validateUpdatedAttribute,
  updateAttributeController as RequestHandler,
);

// Endpoint for all attributes linked to a specific quest fetching
router.get(
  "/quests-attributes/:questId",
  authenticateToken,
  getAllAttributesToQuestController as RequestHandler,
);

export default router;
