import express from "express";
import {
  authenticateToken,
  logInUser,
  logOutUser,
  createNewAccessToken,
} from "../controllers/authController.js";
import { validateUserCredentials } from "../middlewares/inputValidators.js";

// Initialize and export express router for authentication routes
const router = express.Router();

const posts = [
  {
    id: 14,
    name: "Strength",
  },
];

router.get("/posts", authenticateToken, (req, res) => {
  res.json(posts.filter((post) => post.id === req.user.id));
});

// Logs the user in
router.post("/login", validateUserCredentials, logInUser);
// Creates new access token
router.post("/token", createNewAccessToken);
// Logs the user out
router.delete("/logout", logOutUser);

export default router;
