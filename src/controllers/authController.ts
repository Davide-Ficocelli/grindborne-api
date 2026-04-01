import jwt from "jsonwebtoken";
import { getUserByEmailService } from "../models/usersModel.ts";
import handleResponse from "../utils/handleResponse.ts";
import bcrypt from "bcrypt";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthPayload, type AuthRequest } from "../types/auth.ts";

const generateAccessToken = (user: Object) =>
  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET as string, {
    expiresIn: "1h",
  });

// Refresh tokens
// WARNING: refresh tokens must be stored either in a database or in cache, using this variable is for testing purposes only

export let refreshTokens: string[] = [];

export const logInUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
      hashedPassword as string,
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
    const refreshToken = jwt.sign(
      userData,
      process.env.REFRESH_TOKEN_SECRET as string,
    );

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

// Logs user out
export const logOutUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Normally you would delete refresh tokens from the database but since they're currently being stored in a local array they just get filtered out
    refreshTokens = refreshTokens.filter((token) => token !== req.body.token);
    handleResponse(res, 204, "Refresh token successfuly deleted");
  } catch (err) {
    next(err);
  }
};

// Function which authenticates the user token containing their id
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Getting the authorization header
    const authHeader = req.headers["authorization"];
    // Returning the token if it exists other wise undefined
    const token = authHeader && authHeader.split(" ")[1];

    // Sending back a failure status code if no token exists
    if (!token) return handleResponse(res, 401, "Token not provided");

    // Verify token validity
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
      (
        err: jwt.VerifyErrors | null,
        user: jwt.JwtPayload | string | undefined,
      ) => {
        // Returning status code if an error exist
        if (err) return handleResponse(res, 403, "Invalid or expired token"); // 403 = Token no longer valid
        const payload = user as AuthPayload; // We know { id: ... } has been used in sign
        (req as AuthRequest).user = payload;
        next();
      },
    );
  } catch (err) {
    next(err);
  }
};

export const createNewAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Getting refresh token from the request
    const refreshToken = req.body.token;
    // If either no refresh token exists or no refresh codes are available then return an error status code
    if (!refreshToken)
      return handleResponse(res, 401, "Refresh token not provided");
    if (!refreshTokens.includes(refreshToken))
      return handleResponse(res, 404, "Refresh token not found");
    // Verifying refresh token validity
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
      (
        err: jwt.VerifyErrors | null,
        user: jwt.JwtPayload | string | undefined,
      ) => {
        // If an error occurs it gets returned alongside the status code
        if (err) return handleResponse(res, 403, "Invalid refresh token");

        const payload = user as AuthPayload;

        // New access token is created and returned using user's id
        const accessToken = generateAccessToken({ id: payload.id });
        handleResponse(
          res,
          201,
          "Access token successfully created",
          accessToken,
        );
      },
    );
  } catch (err) {
    next(err);
  }
};
