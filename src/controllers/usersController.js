import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import handleResponse from "../utils/handleResponse.js";
import {
  createUserService,
  deleteUserService,
  getAllUsersService,
  getUserByIdService,
  getUserByEmailService,
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

export const loginUser = async (req, res, next) => {
  try {
    // Fetch users by using the sent email in the request body as the input for the function
    const user = await getUserByEmailService(req.body.email);

    // If user was not found then stop response and send an error message to the client
    if (!user) return handleResponse(res, 404, "User not found");

    // Save sent password from the request body
    const inputPassword = req.body.password;

    // If no password was provided then stop response and send an error message to the client
    if (!inputPassword)
      return handleResponse(res, 400, "Credentials not provided");

    // Getting hashed password
    const hashedPassword = user.password_hash;

    // Comparing input password and hashed password
    const doPasswordsMatch = await bcrypt.compare(
      inputPassword,
      hashedPassword,
    );

    // Returning an error message if passwords do not match
    if (!doPasswordsMatch)
      return handleResponse(res, 401, "Incorrect credentials");

    // === JSON web token implementation ===

    // User object
    const userObj = {
      id: user.id,
    };

    // Get access token containing user id
    const accessToken = jwt.sign(userObj, process.env.ACCESS_TOKEN_SECRET);

    // Returning a success message and access token if passwords match
    if (doPasswordsMatch)
      return handleResponse(res, 200, "Successfully logged in", {
        accessToken,
      });
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

// Function which authenticates the user token containing their id
export const authenticateToken = (req, res, next) => {
  try {
    // Getting the authorization header
    const authHeader = req.headers["authorization"];
    // Returning the token if it exists other wise undefined
    const token = authHeader && authHeader.split(" ")[1];

    // Sending back a failure status code if no token exists
    if (!token) return handleResponse(res, 401, "Token not provided");

    // Verify token validity
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      console.log(err);
      // Returning status code if an error exist
      if (err) return handleResponse(res, 403, "Invalid or expired token"); // 403 = Token no longer valid
      req.user = user; // The user parameter passed in the function represents the user object created in the loginUser function
      next();
    });
  } catch (err) {
    next(err);
  }
};
