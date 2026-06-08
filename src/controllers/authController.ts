import jwt from "jsonwebtoken";

// Importing types
import { type Request, type Response, type NextFunction } from "express";
import { type AuthPayload, type AuthRequest } from "../types/auth.ts";

// Importing functions
import {
  logInUserService,
  logOutUserService,
  createNewAccessTokenService,
} from "../services/authService.ts";
import handleResponse from "../utils/handleResponse.ts";

export const logInUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get email and password sent from the request body
    const inputEmail: string = req.body.email;
    const inputPassword = req.body.password;

    // Start the log in user service function
    const loggedInUser = await logInUserService(inputEmail, inputPassword);

    // Get and return service results
    const { ok, status, message, data } = loggedInUser;

    return handleResponse(res, ok, status, message, data);
  } catch (err) {
    next(err);
  }
};

// Logs user out
export const logOutUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token
    const token: string = req.body.token;

    // Start the service
    const loggedOutUser = await logOutUserService(token);

    // Get and return service results
    const { ok, status, message } = loggedOutUser;

    return handleResponse(res, ok, status, message);
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

export const createNewAccessTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Getting refresh token from the request
    const refreshToken = req.body.token;

    // Start the service
    const newAccessToken = await createNewAccessTokenService(refreshToken);

    // Get and return service results
    const { ok, status, message, data } = newAccessToken;

    return handleResponse(res, ok, status, message, data);

    // // If either no refresh token exists or no refresh codes are available then return an error status code
    // if (!refreshToken)
    //   return handleResponse(res, 401, "Refresh token not provided");
    // if (!refreshTokens.includes(refreshToken))
    //   return handleResponse(res, 404, "Refresh token not found");
    // // Verifying refresh token validity
    // jwt.verify(
    //   refreshToken,
    //   process.env.REFRESH_TOKEN_SECRET as string,
    //   (
    //     err: jwt.VerifyErrors | null,
    //     user: jwt.JwtPayload | string | undefined,
    //   ) => {
    //     // If an error occurs it gets returned alongside the status code
    //     if (err) return handleResponse(res, 403, "Invalid refresh token");

    //     const payload = user as AuthPayload;

    //     // New access token is created and returned using user's id
    //     const accessToken = generateAccessToken({ id: payload.id });
    //     handleResponse(
    //       res,
    //       201,
    //       "Access token successfully created",
    //       accessToken,
    //     );
    //   },
    // );
  } catch (err) {
    next(err);
  }
};
