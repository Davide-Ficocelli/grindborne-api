// Import the default export from the "pg" library (node-postgres), which
// is a collection of tools for working with PostgreSQL from Node.js.
import pkg from "pg";

// Import the default export from "dotenv", a library that loads environment
// variables from a .env file into process.env.
import dotenv from "dotenv";

// Destructure the Pool class from the imported pg package.
// Pool manages a pool of client connections to the database.
const { Pool } = pkg;

// Load environment variables from the .env file into process.env.
// This should run before you access any process.env.DB_* variables.
dotenv.config();

// Create a new connection pool using configuration values read from
// environment variables. These are defined in the .env file or
// in the environment where the app runs.
const pool = new Pool({
  user: process.env.DB_USER, // database username
  host: process.env.DB_HOST, // database host
  database: process.env.DB_NAME, // database name
  password: process.env.DB_PASSWORD, // database user password
  port: process.env.DB_PORT, // database port (usually 5432)
});

// Listen for the "connect" event on the pool. This event fires when
// a new client successfully connects to the PostgreSQL server.
pool.on("connect", () => {
  console.log("Connection pool established with Database");
});

// Export the configured pool as the default export so other modules can
// import it and use pool.query(...) to run SQL against the database.
export default pool;
