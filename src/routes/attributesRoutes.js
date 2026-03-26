import express from "express";
import { authenticateToken } from "../controllers/authController.js";
import { createNewAttribute } from "../controllers/attributesController.js";
import { validateNewAttribute } from "../middlewares/inputValidators.js";

// Initialize and export express router for attributes routes
const router = express.Router();

// // Endpoint for user attribute retrieval
// router.get("/attributes", authenticateToken, getAllUserAttributes);

// Endpoint for user attribute creation
router.post(
  "/attributes",
  authenticateToken,
  validateNewAttribute,
  createNewAttribute,
);

export default router;
