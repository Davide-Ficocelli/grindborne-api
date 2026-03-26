import express from "express";
import { authenticateToken } from "../controllers/authController.js";
import {
  createNewAttribute,
  deleteAttribute,
  getAttributesByUserId,
} from "../controllers/attributesController.js";
import { validateNewAttribute } from "../middlewares/inputValidators.js";

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

export default router;
