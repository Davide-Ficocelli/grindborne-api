import jwt from "jsonwebtoken";
import { getUserByEmailService } from "../models/usersModel.js";
import handleResponse from "../utils/handleResponse.js";
import bcrypt from "bcrypt";

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

    // User object
    const userObj = {
      id: user.id,
    };

    // Generating access token containing user id
    const accessToken = jwt.sign(userObj, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });

    // Generating a refresh token
    const refreshToken = jwt.sign(userObj, process.env.REFRESH_TOKEN_SECRET);

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
