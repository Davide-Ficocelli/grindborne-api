import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./config/db.js";
import { ALLOWED_ORIGINS } from "./config/globals.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import attributesRoutes from "./routes/attributesRoutes.js";
import grindsRoutes from "./routes/grindsRoutes.js";
import questsRoutes from "./routes/questsRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import startCleanupJob from "./jobs/cleanupJob.js";
import startDecayAttributesJob from "./jobs/decayAttributesJob.js";

// Importing types for request and response
import { type Request, type Response } from "express";

// Dotenv configuration
dotenv.config();

// Initialize express app
const app = express();

// Define server's port
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// Defining the base URL API prefix
const baseUrlPrefix: string = "/grindborne/api/v1";

// Middlewares

// CORS MUST run before express.json() and before any route handlers.
// Two reasons:
//   1. Preflight OPTIONS requests don't have a body, so running the JSON
//      parser first does nothing useful—but it's cleaner to reject
//      disallowed origins before any other middleware touches the request.
//   2. If any middleware upstream throws on an OPTIONS request (e.g., a
//      body-parsing error, an auth check), the preflight fails and the
//      browser reports a CORS error—masking the real cause.
//
// The origin callback form is used (rather than a plain array) purely for
// debuggability: we can log rejected origins during development.
app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, Postman, server-to-server, mobile apps)
      // don't send an Origin header. The browser always does. We allow
      // "no origin" requests through—they're not subject to the browser's
      // CORS enforcement anyway, so blocking them here would just break
      // local testing.
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Reject anything else. Logging here is invaluable when you deploy
      // and discover your production frontend URL doesn't match what you
      // thought it was.
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true, // REQUIRED for withCredentials: true to work
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // X-CSRF-Token MUST be allowed explicitly. Without it, the CORS
    // preflight for /auth/refresh and /auth/logout from the legitimate
    // frontend will fail, and the actual request will never go through.
    // Note: header names in this array are case-insensitive but must be
    // listed literally; the browser treats X-CSRF-Token as needing a
    // preflight because it is not a CORS-safelisted header.
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

app.use(express.json());

// The cookie-parser middleware populates req.cookies by reading the "Cookie" header.
// Must be mounted BEFORE auth routes because authController reads req.cookies.
// The order with respect to express.json() is indifferent (they say different things),
// but keeping them close makes it obvious that they both prepare the request.
app.use(cookieParser());

// Routes

// Each use of app.use() is needed to set "/grindborne/api/v1/" as the base URL prefix for all routes mounted here

// Authentication routes
app.use(`${baseUrlPrefix}/auth`, authRoutes);

// Attributes routes
app.use(baseUrlPrefix, attributesRoutes);

// Grinds routes
app.use(baseUrlPrefix, grindsRoutes);

// Quests routes
app.use(baseUrlPrefix, questsRoutes);

// Users routes
app.use(`${baseUrlPrefix}/users`, usersRoutes);

// Sending test data
app.get("/api/v1", (req: Request, res: Response) => {
  res.send("Hello world");
});

// Testing POSTGRES connection
app.get("/", async (req: Request, res: Response) => {
  console.log("start");
  const result = await pool.query("SELECT current_database()");
  res.send(`The database name is: ${result.rows[0].current_database}`);
});

// ---> Initialize the cron job <---
startCleanupJob();
startDecayAttributesJob();

// Server running
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
