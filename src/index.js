import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./config/db.js";
// import compression from "compression";
import attributesRoutes from "./routes/attributesRoutes.js";
import grindsRoutes from "./routes/grindsRoutes.js";
import questsRoutes from "./routes/questsRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";

// Dotenv configuration
dotenv.config();

// Initialize express app
const app = express();

// Define server's port
const port = process.env.PORT || 3001;

// Defining the base URL API prefix
const baseUrlPrefix = "/grindborne/api/v1";

// Middlewares
app.use(express.json());
app.use(cors());
// app.use(compression());

// Routes

// Each use of app.use() is needed to set "/grindborne/api/v1/" as the base URL prefix for all routes mounted here

// Attributes routes
app.use(baseUrlPrefix, attributesRoutes);

// Grinds routes
app.use(baseUrlPrefix, grindsRoutes);

// Quests routes
app.use(baseUrlPrefix, questsRoutes);

// Users routes
app.use(`${baseUrlPrefix}/users`, usersRoutes);

// Sending test data
app.get("/api/v1", (req, res) => {
  res.send("Hello world");
});

// Testing POSTGRES connection
app.get("/", async (req, res) => {
  console.log("start");
  const result = await pool.query("SELECT current_database()");
  res.send(`The database name is: ${result.rows[0].current_database}`);
});

// Server running
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
