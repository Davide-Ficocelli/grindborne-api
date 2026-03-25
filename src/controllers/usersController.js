import bcrypt from "bcrypt";
import handleResponse from "../utils/handleResponse.js";
import {
  createUserService,
  deleteUserService,
  getAllUsersService,
  getUserByIdService,
  updateUserService,
} from "../models/usersModel.js";

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const saltRounds = 10;

    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await createUserService(name, email, passwordHash);
    handleResponse(res, 201, "User created successfully", newUser);

    // VERY IMPORTANT: DO NOT return the hashed password in the response
    if (newUser && newUser.password_hash) {
      delete newUser.password_hash;
    }
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await getAllUsersService();
    handleResponse(res, 200, "Users fetched successfully", users);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await getUserByIdService(req.params.id);
    if (!user) return handleResponse(res, 404, "User not found");
    handleResponse(res, 200, "User fetched successfully", user);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  const { name, email, level, stamina } = req.body;
  try {
    const updatedUser = await updateUserService(
      req.params.id,
      name,
      email,
      level,
      stamina,
    );
    if (!updatedUser) return handleResponse(res, 404, "User not found");
    handleResponse(res, 200, "User updated successfully", updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const deletedUser = await deleteUserService(req.params.id);
    if (!deletedUser) return handleResponse(res, 404, "User not found");
    handleResponse(res, 200, "User deleted successfully", deletedUser);
  } catch (err) {
    next(err);
  }
};
