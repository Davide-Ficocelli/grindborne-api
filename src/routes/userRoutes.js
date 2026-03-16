import { router } from "../index.js";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { validateUser } from "../middlewares/inputValidator.js";

router.post("/users", validateUser, createUser);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", validateUser, updateUser);
router.delete("/users/:id", deleteUser);
