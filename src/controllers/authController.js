import jwt from "jsonwebtoken";
import { getUserByEmailService } from "../models/usersModel.js";
import handleResponse from "../utils/handleResponse.js";
import bcrypt from "bcrypt";

const generateAccessToken = (user) =>
  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

// Refresh tokens
// WARNING: refresh tokens must be stored either in a database or in cache, using this variable is for testing purposes only

export let refreshTokens = [];

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

    // User data object
    const userData = {
      id: user.id,
    };

    // Generating access token containing user id
    const accessToken = generateAccessToken(userData);

    // Generating a refresh token
    const refreshToken = jwt.sign(userData, process.env.REFRESH_TOKEN_SECRET);

    // Pushing new refresh token in refresh tokens array
    refreshTokens.push(refreshToken);

    // Returning a success message and access token if passwords match
    if (doPasswordsMatch)
      return handleResponse(res, 200, "Successfully logged in", {
        accessToken,
        refreshToken,
      });
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
      // Returning status code if an error exist
      if (err) return handleResponse(res, 403, "Invalid or expired token"); // 403 = Token no longer valid
      req.user = user; // The user parameter passed in the function represents the user object created in the loginUser function
      next();
    });
  } catch (err) {
    next(err);
  }
};

export const createNewAccessToken = (req, res, next) => {
  try {
    // Getting refresh token from the request
    const refreshToken = req.body.token;
    // If either no refresh token exists or no refresh codes are available then return an error status code
    if (!refreshToken) return handleResponse(res, 401);
    if (!refreshTokens.includes(refreshToken)) return handleResponse(res, 403);
    // Verifying refresh token validity
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      // If an error occurs it gets returned alongside the status code
      if (err) return handleResponse(res, 403);
      // New access token is created and returned using user's id
      const accessToken = generateAccessToken({ id: user.id });
      handleResponse(
        res,
        201,
        "Access token successfully created",
        accessToken,
      );
    });
  } catch (err) {
    next(err);
  }
};
