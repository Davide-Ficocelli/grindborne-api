import { Router } from "express";
import { authenticateToken } from "../controllers/authController.js";
import {
  createNewUserController,
  getUserByIdController,
  updateUserController,
  softDeleteUserController,
} from "../controllers/usersController.js";
import {
  validateNewUser,
  validateUpdatedUser,
} from "../middlewares/inputValidators.js";

// Importing types
import { type RequestHandler } from "express";

// Initialize and export express router for users routes
const router: Router = Router();

// Creates new user
router.post("/", validateNewUser, createNewUserController as RequestHandler);

// Gets a specific user
router.get("/:id", authenticateToken, getUserByIdController as RequestHandler);

// Updates a user
router.put(
  "/:id",
  authenticateToken,
  validateUpdatedUser,
  updateUserController as RequestHandler,
);

// Soft-deletes a user
router.patch(
  "/:id",
  authenticateToken,
  softDeleteUserController as RequestHandler,
);

export default router;
