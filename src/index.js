import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./config/db.js";

// Dotenv configuration
dotenv.config();

// Initialize express app
const app = express();

// Define server's port
const port = process.env.PORT || 3001;

// Middlewares
app.use(express.json());
app.use(cors());

// Routes

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
