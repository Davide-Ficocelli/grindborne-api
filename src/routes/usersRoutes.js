import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  loginUser,
  updateUser,
  deleteUser,
  authenticateToken,
} from "../controllers/usersController.js";
import {
  validateNewUser,
  validateUpdatedUser,
  validateUserCredentials,
} from "../middlewares/inputValidators.js";

// Initialize and export express router for users routes
const router = express.Router();

router.post("/", validateNewUser, createUser);
router.get("/", getAllUsers);
router.post("/login", validateUserCredentials, loginUser);
router.get("/:id", getUserById);
router.put("/:id", validateUpdatedUser, updateUser);
router.delete("/:id", deleteUser);

export default router;
