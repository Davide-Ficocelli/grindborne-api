import express from "express";
import { createAttribute } from "../controllers/attributesController.js";
import { validateNewAttribute } from "../middlewares/inputValidators.js";

// Initialize and export express router for attributes routes
const router = express.Router();

// Endpoint for user attribute creation
router.post("/attributes", validateNewAttribute, createAttribute);

export default router;
