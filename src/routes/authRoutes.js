import express from "express";
import {
  authenticateToken,
  loginUser,
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

router.post("/token", createNewAccessToken);

router.post("/login", validateUserCredentials, loginUser);

export default router;
