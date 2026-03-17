import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
import { validateUser } from "../middlewares/inputValidator.js";

// Initialize and export express router for users routes
const router = express.Router();

router.post("/", validateUser, createUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", validateUser, updateUser);
router.delete("/:id", deleteUser);

export default router;
