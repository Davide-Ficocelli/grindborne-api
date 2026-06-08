// Importing types
import type ServiceValidation from "../types/serviceValidation.ts";
import { type AuthPayload, type AuthRequest } from "../types/auth.ts";

// Importing functions
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getUserByEmailModel } from "../models/usersModel.ts";

// Helper functions

// Generates an access Token
const generateAccessToken = (user: Object) =>
  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string); // Here it's possible to set an expiration time for the token in an object e. g. {expiresIn: "1h"} token doesn't expire in development

// Refresh tokens
// WARNING: refresh tokens must be stored either in a database or in cache, using this variable is for testing purposes only
// CHANGE THIS IN PRODUCTION

export let refreshTokens: string[] = [];

// Logs a user in
export const logInUserService = async (
  inputEmail: string,
  inputPassword: string,
): Promise<ServiceValidation> => {
  // Fetch users by using the sent email in the request body as the input for the function
  const user = await getUserByEmailModel(inputEmail);

  // If user was not found then stop response and send an error message to the client
  if (!user) return { ok: false, status: 404, message: "User not found" };

  // Getting user data from db

  const { id, email, password_hash } = user;

  // If no password was provided then stop response and send an error message to the client
  if (!inputPassword || !inputEmail)
    return { ok: false, status: 400, message: "Credentials not provided" };

  // Comparing

  // Comparing input email with user email
  const doEmailsMatch = inputEmail === email;

  // Comparing input password and hashed password
  const doPasswordsMatch = await bcrypt.compare(
    inputPassword,
    password_hash as string,
  );

  // Returning an error message if passwords or emails do not match
  if (!doEmailsMatch || !doPasswordsMatch)
    return { ok: false, status: 401, message: "Incorrect credentials" };

  // === JSON web token implementation ===

  // User data object
  const userData = {
    id,
  };

  // Generating access token containing user id
  const accessToken = generateAccessToken(userData);

  // Generating a refresh token
  const refreshToken = jwt.sign(
    userData,
    process.env.REFRESH_TOKEN_SECRET as string,
  );

  // Pushing new refresh token in refresh tokens array
  refreshTokens.push(refreshToken);

  // Returning a success message and access token if passwords match
  if (doPasswordsMatch)
    return {
      ok: true,
      status: 200,
      message: "Successfully logged in",
      data: {
        accessToken,
        refreshToken,
      },
    };
  // If something went wrong return a failure state
  else
    return {
      ok: false,
      status: 500,
      message: "Something went wrong while logging in",
    };
};

// Logs a user out
export const logOutUserService = async (token: string) => {
  // If no token was provided return a failure state
  if (!token) return { ok: false, status: 400, message: "No token provided" };

  // Normally you would delete refresh tokens from the database but since they're currently being stored in a local array they just get filtered out
  refreshTokens = refreshTokens.filter((token) => token !== token);

  return {
    ok: true,
    status: 204,
    message: "Refresh token successfuly deleted",
  };
};

export const createNewAccessTokenService = async (
  refreshToken: string,
): Promise<ServiceValidation> => {
  // 1. Initial validation checks
  if (!refreshToken) {
    return { ok: false, status: 401, message: "Refresh token not provided" };
  }

  if (!refreshTokens.includes(refreshToken)) {
    return { ok: false, status: 404, message: "Refresh token not found" };
  }

  // 2. Synchronous JWT Verification inside a try/catch
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    );

    const payload = decoded as AuthPayload;

    // 3. Generate new access token
    const accessToken = generateAccessToken({ id: payload.id });

    // 4. Return success object directly
    return {
      ok: true,
      status: 201,
      message: "Access token successfully created",
      data: accessToken,
    };
  } catch (err) {
    // 5. Catch any verification errors (expired, invalid signature, etc.)
    return {
      ok: false,
      status: 403,
      message: "Invalid refresh token",
    };
  }
};
