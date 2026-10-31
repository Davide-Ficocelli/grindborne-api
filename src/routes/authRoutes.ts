import { Router } from "express";
import {
  logInUserController,
  logOutUserController,
  refreshTokenController,
} from "../controllers/authController.js";
import { validateUserCredentials } from "../middlewares/inputValidators.js";
import { verifyCsrf } from "../middlewares/verifyCsrf.js";

// Initialize and export express router for authentication routes
const router = Router();

// Login does NOT need verifyCsrf: it does not trust any pre-existing
// credential (the user is supplying their own email/password explicitly,
// which is not something a CSRF attacker can obtain). The endpoint's job
// is precisely to establish the cookie that later endpoints trust.
router.post("/login", validateUserCredentials, logInUserController);

// Both endpoints below authenticate via the HttpOnly refresh cookie, which
// the browser sends automatically. That automatic transmission is exactly
// the CSRF attack vector, so they MUST be guarded.
router.delete("/logout", verifyCsrf, logOutUserController);
router.post("/refresh", verifyCsrf, refreshTokenController);

export default router;
