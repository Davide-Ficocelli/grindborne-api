import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_MAX_AGE_MS,
  ACCESS_TOKEN_EXPIRATION_TIME,
} from "../config/globals.js";
import jwt from "jsonwebtoken";

// Importing types
import {
  type Request,
  type Response,
  type NextFunction,
  type CookieOptions,
} from "express";

// Shared options between set and cookie clear.
// Decision: Centralize them into a single object because Express, for
// delete a cookie (res.clearCookie), it requires EXACTLY the same ones
// options used to set it (at least path, sameSite, secure). If they diverge,
// The browser does not recognize the deletion and the cookie remains.
// Keeping only one source of truth avoids this classic bug.
const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript (and therefore an XSS) cannot read the cookie
  secure: process.env.NODE_ENV === "production", // in dev (HTTP) must be false, otherwise the browser discards the cookie
  sameSite: "none", // strict = not sent by cross-site requests: mitigate CSRF
  path: REFRESH_TOKEN_COOKIE_PATH, // sent only to auth routes
  maxAge: REFRESH_TOKEN_MAX_AGE_MS, // expiration aligned with the JWT
};

// Set the cookie with the refresh token. Used on login and refresh.
export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, refreshTokenCookieOptions);
}

// Clear the cookie. Used on logout and when refresh fails.
// Note: res.clearCookie must receive the same options as the set
// (especially path), otherwise the browser will not find the cookie to delete.
export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenCookieOptions);
}

export const generateAccessToken = (user: object) =>
  jwt.sign(
    user,
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: ACCESS_TOKEN_EXPIRATION_TIME } as jwt.SignOptions,
  ); // Here it's possible to set an expiration time for the token in an object e. g. {expiresIn: "1h"} token doesn't expire in development
