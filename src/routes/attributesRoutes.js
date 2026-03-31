import express from "express";
import { authenticateToken } from "../controllers/authController.js";
import {
  createNewAttribute,
  deleteAttribute,
  getAttributesByUserId,
  updateAttribute,
} from "../controllers/attributesController.js";
import {
  validateNewAttribute,
  validateUpdatedAttribute,
} from "../middlewares/inputValidators.ts";

// Initialize and export express router for attributes routes
const router = express.Router();

// // Endpoint for all user attributes retrieval
router.get("/attributes", authenticateToken, getAttributesByUserId);

// Endpoint for user attribute creation
router.post(
  "/attributes",
  authenticateToken,
  validateNewAttribute,
  createNewAttribute,
);

// Endpoint for user attribute deletion
router.delete("/attributes/:id", authenticateToken, deleteAttribute);

// Endpoint for user attribute update
// You must think very carefully about which fields the user will be able to update and which ones they won't
router.put(
  "/attributes/:id",
  authenticateToken,
  validateUpdatedAttribute,
  updateAttribute,
);

export default router;
