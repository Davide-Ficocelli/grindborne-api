import { Router, type RequestHandler } from "express";
import { authenticateToken } from "../controllers/authController.ts";
import {
  createNewAttribute,
  deleteAttribute,
  getAttributesByUserId,
  updateAttribute,
} from "../controllers/attributesController.ts";
import {
  validateNewAttribute,
  validateUpdatedAttribute,
} from "../middlewares/inputValidators.ts";

// Initialize and export express router for attributes routes
const router = Router();

// // Endpoint for all user attributes retrieval
router.get(
  "/attributes",
  authenticateToken,
  getAttributesByUserId as RequestHandler,
);

// Endpoint for user attribute creation
router.post(
  "/attributes",
  authenticateToken,
  validateNewAttribute,
  createNewAttribute as RequestHandler,
);

// Endpoint for user attribute deletion
router.delete(
  "/attributes/:id",
  authenticateToken,
  deleteAttribute as RequestHandler,
);

// Endpoint for user attribute update
// You must think very carefully about which fields the user will be able to update and which ones they won't
router.put(
  "/attributes/:id",
  authenticateToken,
  validateUpdatedAttribute,
  updateAttribute as RequestHandler,
);

export default router;
