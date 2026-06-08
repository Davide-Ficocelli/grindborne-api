import { Router } from "express";
import {
  logInUserController,
  logOutUserController,
  createNewAccessTokenController,
} from "../controllers/authController.ts";
import { validateUserCredentials } from "../middlewares/inputValidators.ts";

// Initialize and export express router for authentication routes
const router = Router();

// Logs the user in
router.post("/login", validateUserCredentials, logInUserController);
// Creates new access token
router.post("/token", createNewAccessTokenController);
// Logs the user out
router.delete("/logout", logOutUserController);

export default router;
