import { Router } from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/usersController.ts";
import {
  validateNewUser,
  validateUpdatedUser,
} from "../middlewares/inputValidators.ts";

// Initialize and export express router for users routes
const router: Router = Router();

router.post("/", validateNewUser, createUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", validateUpdatedUser, updateUser);
router.delete("/:id", deleteUser);

export default router;
