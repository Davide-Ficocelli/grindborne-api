import { Router } from "express";
import {
  logInUser,
  logOutUser,
  refreshToken,
} from "../controllers/authController.js";
import { validateUserCredentials } from "../middlewares/inputValidators.js";

// Initialize and export express router for authentication routes
const router = Router();

// Logs the user in
router.post("/login", validateUserCredentials, logInUser);
// Logs the user out
router.delete("/logout", logOutUser);
// Processes refresh tokens received by the client
router.post("/refresh", refreshToken);

export default router;
