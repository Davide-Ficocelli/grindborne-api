import express from "express";
import { authenticateToken } from "../controllers/authController.js";
import { createAttribute } from "../controllers/attributesController.js";
import { validateNewAttribute } from "../middlewares/inputValidators.js";

// Initialize and export express router for attributes routes
const router = express.Router();

// Endpoint for user attribute creation
router.post(
  "/attributes",
  authenticateToken,
  validateNewAttribute,
  createAttribute,
);

export default router;
