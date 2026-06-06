import { Router } from "express";
import { authenticateToken } from "../controllers/authController.ts";
import {
  createNewUserController,
  getUserByIdController,
  updateUserController,
  deleteUserController,
} from "../controllers/usersController.ts";
import {
  validateNewUser,
  validateUpdatedUser,
} from "../middlewares/inputValidators.ts";

// Importing types
import { type RequestHandler } from "express";

// Initialize and export express router for users routes
const router: Router = Router();

router.post("/", validateNewUser, createNewUserController as RequestHandler);
router.get("/:id", authenticateToken, getUserByIdController as RequestHandler);
router.put(
  "/:id",
  authenticateToken,
  validateUpdatedUser,
  updateUserController as RequestHandler,
);
router.delete(
  "/:id",
  authenticateToken,
  deleteUserController as RequestHandler,
);

export default router;
