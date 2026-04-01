import { Router } from "express";
import {
  authenticateToken,
  logInUser,
  logOutUser,
  createNewAccessToken,
} from "../controllers/authController.ts";
import { validateUserCredentials } from "../middlewares/inputValidators.ts";

// Initialize and export express router for authentication routes
const router = Router();

// Logs the user in
router.post("/login", validateUserCredentials, logInUser);
// Creates new access token
router.post("/token", createNewAccessToken);
// Logs the user out
router.delete("/logout", logOutUser);

export default router;
