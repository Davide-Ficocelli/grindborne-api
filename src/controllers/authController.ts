import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../shared/authHelpers.js";
import { getUserByEmailModel } from "../models/usersModel.js";
import {
  addRefreshTokenModel,
  getRefreshTokenModel,
  deleteRefreshTokenModel,
} from "../models/authModel.js";
import handleResponse from "../utils/handleResponse.js";
import {
  REFRESH_TOKEN_EXPIRATION_TIME,
  REFRESH_TOKEN_COOKIE_NAME,
} from "../config/globals.js";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthPayload, type AuthRequest } from "../types/auth.js";

export const logInUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Fetch users by using the sent email in the request body as the input for the function
    const user = await getUserByEmailModel(req.body.email);

    // If user was not found then stop response and send an error message to the client
    if (!user) return handleResponse(res, false, 404, "Incorrect credentials");

    // Save sent password from the request body
    const inputPassword = req.body.password;

    // If no password was provided then stop response and send an error message to the client
    if (!inputPassword)
      return handleResponse(res, false, 400, "Credentials not provided");

    // Getting hashed password
    const hashedPassword = user.password_hash;

    // Comparing input password and hashed password
    const doPasswordsMatch = await bcrypt.compare(
      inputPassword,
      hashedPassword as string,
    );

    // Returning an error message if passwords do not match
    if (!doPasswordsMatch)
      return handleResponse(res, false, 401, "Incorrect credentials");

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
      {
        jwtid: randomUUID(),
        expiresIn: REFRESH_TOKEN_EXPIRATION_TIME,
      } as jwt.SignOptions,
    );

    // Save the new refresh token in the database
    await addRefreshTokenModel(refreshToken, user.id);

    // MIGRATION TO COOKIES:
    // The refresh token is no longer returned in the body. It is set
    // as an HttpOnly cookie: the client (and any script) no longer sees it.
    // The browser handles it automatically and only sends it to auth routes.
    setRefreshTokenCookie(res, refreshToken);

    // The body contains ONLY the access token. The refresh token exists side
    // client only as a cookie, never as readable data.
    return handleResponse(res, true, 200, "Successfully logged in", {
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// Made this function async to handle the database deletion
export const logOutUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // MIGRATION TO COOKIE:
    // The refresh token now arrives in the cookie, no longer in req.body.token.
    // If it's missing, it's not an error: the user is already logged out (or the cookie is
    // expired). Logout is idempotent, so let's proceed to
    // clear the remaining cookie and respond 200.
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (refreshToken) {
      try {
        // Only if the cookie exists is there anything to revoke on the DB side.
        // If the DB fails here, we still want to clear the cookie
        // (below): Better a clean client with an orphaned token in the DB than
        // a "dirty" client with an impossible-to-remove cookie.
        await deleteRefreshTokenModel(refreshToken);
      } catch {
        // Swallow: A DB failure should not prevent the client from being cleaned up.
        // If the token remains in the DB, it will expire on its own
        // (14d or whatever it was declared in the global variables) and is
        // no longer usable because the browser no longer has the cookie.
      }
    }

    // Clear the cookie. It should ALWAYS be done, regardless of whether
    // the DB has been touched: if the cookie has expired or does not exist,
    // clearCookie is a harmless no-op; if it exists, it actually removes it.
    clearRefreshTokenCookie(res);

    return handleResponse(res, true, 200, "Successfully logged out");
  } catch (err) {
    next(err);
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Reads the refresh token from the COOKIE, no longer from the body.
    // If it's missing, it's not a client error (400): just the user
    // is not authenticated. 401 is the semantically correct status and the
    // frontend already treats it as "refresh failed → show login".
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (!token) {
      return handleResponse(res, false, 401, "Not authenticated");
    }

    // 2. Verify the token's signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string);
    } catch (err) {
      // If the token has expired or is invalid, the cookie is useless.
      // We delete it: on the next attempt the client will receive
      // "no cookie" (401) instead of "invalid token" (401). Same outcome
      // for the frontend, but cleaner browser state.
      clearRefreshTokenCookie(res);
      return handleResponse(
        res,
        false,
        401,
        "Invalid or expired refresh token",
      );
    }

    if (typeof decoded === "string" || typeof decoded.id !== "string") {
      clearRefreshTokenCookie(res);
      return handleResponse(res, false, 401, "Invalid refresh token payload");
    }

    // 3. Check if the token exists in the database (revocation check)
    const storedToken = await getRefreshTokenModel(token);
    if (!storedToken) {
      // The token is not in the DB: it has been revoked (logout) or is a replay.
      // We delete the cookie because it is no longer valid by construction.
      clearRefreshTokenCookie(res);
      return handleResponse(res, false, 401, "Refresh token not recognized");
    }

    // 4. Rotate the refresh token for better security.
    // Delete the old one from the database.
    await deleteRefreshTokenModel(token);

    // 5. Generate a new access token (and a new refresh token).
    // MIGRATION: We use REFRESH_TOKEN_EXPIRATION_TIME instead of the string
    // hardcoded "7d" present in the original. Motivation: the constant is
    // "14d", and the cookie we are about to set has maxAge = 14 days.
    // Misaligning the two durations creates inconsistent states (JWT expired before
    // of the cookie, or vice versa).
    const userData: AuthPayload = { id: decoded.id };
    const newAccessToken = generateAccessToken(userData);
    const newRefreshToken = jwt.sign(
      userData,
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        jwtid: randomUUID(),
        expiresIn: REFRESH_TOKEN_EXPIRATION_TIME, // era "7d" hardcoded
      } as jwt.SignOptions,
    );

    // 6. Save the new refresh token to the database.
    await addRefreshTokenModel(newRefreshToken, decoded.id);

    // MIGRATION: Instead of returning the new refresh token in the body,
    // we set it as a cookie. The browser replaces the previous one
    // (same name and path). The client never sees the token.
    setRefreshTokenCookie(res, newRefreshToken);

    // 7. Send the new ACCESS token back to the client.
    // NO refreshToken in the body: lives only in the cookie.
    return handleResponse(res, true, 200, "Token refreshed successfully", {
      accessToken: newAccessToken,
    });
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
    if (!token) return handleResponse(res, false, 401, "Token not provided");

    // Verify token validity
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
      (
        err: jwt.VerifyErrors | null,
        user: jwt.JwtPayload | string | undefined,
      ) => {
        // Returning status code if an error exist
        if (err)
          return handleResponse(res, false, 403, "Invalid or expired token"); // 403 = Token no longer valid
        const payload = user as AuthPayload; // We know { id: ... } has been used in sign
        (req as AuthRequest).user = payload;
        next();
      },
    );
  } catch (err) {
    next(err);
  }
};
