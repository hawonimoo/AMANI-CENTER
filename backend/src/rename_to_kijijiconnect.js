require("dotenv").config({ path: __dirname + "/../.env" });
const mysql = require("mysql2/promise");

async function updateKijijiConnect() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "org_management",
  });

  console.log("Updating database records from KiliConnect to KijijiConnect...");

  await conn.query("UPDATE hubs SET name = REPLACE(name, 'KiliConnect', 'KijijiConnect'), description = REPLACE(description, 'KiliConnect', 'KijijiConnect')");
  console.log("✓ Updated hubs table");

  await conn.query("UPDATE programs SET name = REPLACE(name, 'KiliConnect', 'KijijiConnect'), description = REPLACE(description, 'KiliConnect', 'KijijiConnect')");
  console.log("✓ Updated programs table");

  await conn.query("UPDATE users SET job_title = REPLACE(job_title, 'KiliConnect', 'KijijiConnect')");
  console.log("✓ Updated users table");

  await conn.query("UPDATE radio_schedules SET program_title = REPLACE(program_title, 'KiliConnect', 'KijijiConnect'), notes = REPLACE(notes, 'KiliConnect', 'KijijiConnect')");
  console.log("✓ Updated radio_schedules table");

  await conn.query("UPDATE field_collaborations SET title = REPLACE(title, 'KiliConnect', 'KijijiConnect'), content = REPLACE(content, 'KiliConnect', 'KijijiConnect')");
  console.log("✓ Updated field_collaborations table");

  await conn.query("UPDATE tasks SET title = REPLACE(title, 'KiliConnect', 'KijijiConnect'), description = REPLACE(description, 'KiliConnect', 'KijijiConnect')");
  console.log("✓ Updated tasks table");

  const [hubRows] = await conn.query("SELECT id, name FROM hubs");
  console.log("Hubs now:", hubRows);

  const [progRows] = await conn.query("SELECT id, name FROM programs");
  console.log("Programs now:", progRows);

  await conn.end();
}

updateKijijiConnect().catch(console.error);
