require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
    });
    const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
    await conn.query(sql);
    console.log("Database and tables initialized successfully.");
    await conn.end();
  } catch (e) {
    console.error("Error setting up database:", e.message);
    process.exit(1);
  }
})();
