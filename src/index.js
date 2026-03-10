import express from "express";
import dotenv from "dotenv";
import cors from "cors";

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

// Server running
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
