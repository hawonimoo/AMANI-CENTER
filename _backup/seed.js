require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "org_management",
    });

    console.log("Connected to database. Starting seeding...");

    // Clear existing data safely
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query("TRUNCATE TABLE daily_reports");
    await conn.query("TRUNCATE TABLE tasks");
    await conn.query("TRUNCATE TABLE program_members");
    await conn.query("TRUNCATE TABLE users");
    await conn.query("TRUNCATE TABLE programs");
    await conn.query("TRUNCATE TABLE hubs");
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    // 1. Insert Hubs
    const hubs = [
      ["Central Innovation Hub", "Headquarters coordinating regional strategy and partnerships."],
      ["Mogadishu Digital Hub", "Focusing on community radio, media tech, and youth digital inclusion."],
      ["Hargeisa Operations Hub", "Leading climate resilience, local agriculture, and finance initiatives."],
    ];
    for (const [name, desc] of hubs) {
      await conn.query("INSERT INTO hubs (name, description) VALUES (?, ?)", [name, desc]);
    }
    const [hubsRows] = await conn.query("SELECT id, name FROM hubs");
    const hubMap = {};
    hubsRows.forEach((h) => (hubMap[h.name] = h.id));

    // 2. Insert Programs
    const programs = [
      ["Radio Broadcast & Community Media", "Community radio production, civic engagement broadcasts, and public education.", hubMap["Mogadishu Digital Hub"]],
      ["Climate Change Adaptation & Resilience", "Drought tracking, sustainable community agriculture, and water management programs.", hubMap["Hargeisa Operations Hub"]],
      ["Digital Skills & Youth Innovation", "Software engineering training, youth mentorship, and local hackathons.", hubMap["Mogadishu Digital Hub"]],
      ["Micro-Finance & Livelihoods", "Small business grants, financial literacy, and savings groups.", hubMap["Hargeisa Operations Hub"]],
      ["Program Management & Monitoring", "Cross-program evaluation, M&E reporting, and impact audits.", hubMap["Central Innovation Hub"]],
    ];
    for (const [name, desc, hubId] of programs) {
      await conn.query("INSERT INTO programs (name, description, hub_id) VALUES (?, ?, ?)", [name, desc, hubId]);
    }
    const [progRows] = await conn.query("SELECT id, name FROM programs");
    const progMap = {};
    progRows.forEach((p) => (progMap[p.name] = p.id));

    // 3. Insert Users
    const defaultPassHash = await bcrypt.hash("password123", 10);
    const adminPassHash = await bcrypt.hash("admin123", 10);

    const users = [
      ["Super Admin", "admin@org.com", adminPassHash, "admin", hubMap["Central Innovation Hub"]],
      ["Asha Warsame", "hub.leader@org.com", defaultPassHash, "hub_leader", hubMap["Mogadishu Digital Hub"]],
      ["Mohamed Ali", "radio.leader@org.com", defaultPassHash, "program_leader", hubMap["Mogadishu Digital Hub"]],
      ["Khadija Nur", "climate.leader@org.com", defaultPassHash, "program_leader", hubMap["Hargeisa Operations Hub"]],
      ["Amina Farah", "amina.staff@org.com", defaultPassHash, "staff", hubMap["Mogadishu Digital Hub"]],
      ["Hassan Abdi", "hassan.staff@org.com", defaultPassHash, "staff", hubMap["Hargeisa Operations Hub"]],
      ["Farah Jama", "farah.staff@org.com", defaultPassHash, "staff", hubMap["Central Innovation Hub"]],
    ];

    for (const [name, email, pass, role, hubId] of users) {
      await conn.query(
        "INSERT INTO users (name, email, password_hash, role, hub_id, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        [name, email, pass, role, hubId]
      );
    }
    const [userRows] = await conn.query("SELECT id, email FROM users");
    const userMap = {};
    userRows.forEach((u) => (userMap[u.email] = u.id));

    // 4. Insert Program Memberships
    const memberships = [
      [userMap["radio.leader@org.com"], progMap["Radio Broadcast & Community Media"]],
      [userMap["amina.staff@org.com"], progMap["Radio Broadcast & Community Media"]],
      [userMap["amina.staff@org.com"], progMap["Digital Skills & Youth Innovation"]],
      [userMap["climate.leader@org.com"], progMap["Climate Change Adaptation & Resilience"]],
      [userMap["hassan.staff@org.com"], progMap["Climate Change Adaptation & Resilience"]],
      [userMap["hassan.staff@org.com"], progMap["Micro-Finance & Livelihoods"]],
      [userMap["farah.staff@org.com"], progMap["Program Management & Monitoring"]],
      [userMap["hub.leader@org.com"], progMap["Digital Skills & Youth Innovation"]],
    ];

    for (const [uid, pid] of memberships) {
      if (uid && pid) {
        await conn.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES (?, ?)", [uid, pid]);
      }
    }

    // 5. Insert Tasks
    const today = new Date();
    const plusDays = (d) => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date.toISOString().slice(0, 10);
    };

    const tasks = [
      [
        progMap["Radio Broadcast & Community Media"],
        userMap["amina.staff@org.com"],
        userMap["radio.leader@org.com"],
        "Record Community Health Radio Episode #42",
        "Interview local doctor about preventive maternal health and edit 30-min audio segment.",
        plusDays(2),
        "in_progress",
      ],
      [
        progMap["Radio Broadcast & Community Media"],
        userMap["amina.staff@org.com"],
        userMap["radio.leader@org.com"],
        "Schedule Weekly Radio Frequency Transmissions",
        "Coordinate with broadcast engineer to verify transmission tower logs and signal quality.",
        plusDays(5),
        "pending",
      ],
      [
        progMap["Radio Broadcast & Community Media"],
        userMap["amina.staff@org.com"],
        userMap["radio.leader@org.com"],
        "Transcribe Listener Feedback Hotline",
        "Summarize listener voice notes from SMS hotline into monthly report sheet.",
        plusDays(-1),
        "completed",
      ],
      [
        progMap["Climate Change Adaptation & Resilience"],
        userMap["hassan.staff@org.com"],
        userMap["climate.leader@org.com"],
        "Inspect Borehole Sensor Telemetry",
        "Verify water level telemetry IoT sensors installed across 4 test sites.",
        plusDays(3),
        "in_progress",
      ],
      [
        progMap["Climate Change Adaptation & Resilience"],
        userMap["hassan.staff@org.com"],
        userMap["climate.leader@org.com"],
        "Draft Rain Harvesting Community Training Manual",
        "Prepare Somali and English slides for local farmer co-op training.",
        plusDays(7),
        "pending",
      ],
      [
        progMap["Program Management & Monitoring"],
        userMap["farah.staff@org.com"],
        userMap["admin@org.com"],
        "Compile Q3 Program Impact Indicators",
        "Consolidate daily report logs across all 5 programs into quarterly executive summary.",
        plusDays(4),
        "in_progress",
      ],
    ];

    for (const [pId, toId, byId, title, desc, dueDate, status] of tasks) {
      if (pId && toId && byId) {
        await conn.query(
          "INSERT INTO tasks (program_id, assigned_to, assigned_by, title, description, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [pId, toId, byId, title, desc, dueDate, status]
        );
      }
    }

    // 6. Insert Daily Reports
    const minusDays = (d) => {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      return date.toISOString().slice(0, 10);
    };

    const reports = [
      [
        userMap["amina.staff@org.com"],
        progMap["Radio Broadcast & Community Media"],
        minusDays(0),
        "Completed audio mastering for Episode 42. Conducted telephone pre-interviews with 2 youth leaders.",
        "Audio mixer channel 3 had minor hum; adjusted grounding cable.",
        "Schedule studio recording session for Wednesday morning at 10 AM.",
        "submitted",
        null,
        null,
      ],
      [
        userMap["amina.staff@org.com"],
        progMap["Radio Broadcast & Community Media"],
        minusDays(1),
        "Researched listener survey responses. Compiled 45 submissions into feedback spreadsheet.",
        "A few rural calls had broken audio files.",
        "Follow up with technical support for backup recording files.",
        "reviewed",
        "Great work Amina. Let us feature the youth comments on Friday's live segment.",
        userMap["radio.leader@org.com"],
      ],
      [
        userMap["hassan.staff@org.com"],
        progMap["Climate Change Adaptation & Resilience"],
        minusDays(0),
        "Field visit to 2 water harvesting pilot sites. Collected soil moisture sensor readings.",
        "Solar inverter at site B showed low battery error.",
        "Order replacement fuse and coordinate with technician tomorrow.",
        "submitted",
        null,
        null,
      ],
      [
        userMap["farah.staff@org.com"],
        progMap["Program Management & Monitoring"],
        minusDays(1),
        "Aggregated monthly staff attendance and daily report submission stats.",
        "Three field staff were delayed in submitting reports due to internet downtime.",
        "Provide offline submission form option.",
        "needs_changes",
        "Please provide breakdown by program hub so we can see regional coverage.",
        userMap["admin@org.com"],
      ],
    ];

    for (const [uId, pId, rDate, work, chal, nextStep, status, comment, revBy] of reports) {
      if (uId && pId) {
        await conn.query(
          `INSERT INTO daily_reports (user_id, program_id, report_date, work_done, challenges, next_steps, status, leader_comment, reviewed_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uId, pId, rDate, work, chal, nextStep, status, comment, revBy]
        );
      }
    }

    console.log("Seeding completed successfully!");
    console.log("\n--- TEST LOGIN CREDENTIALS ---");
    console.log("Admin:          admin@org.com         / admin123");
    console.log("Hub Leader:     hub.leader@org.com    / password123");
    console.log("Program Leader: radio.leader@org.com  / password123");
    console.log("Staff (Amina):  amina.staff@org.com   / password123");
    console.log("Staff (Hassan): hassan.staff@org.com  / password123");

    await conn.end();
  } catch (error) {
    console.error("Seeding error:", error);
    if (conn) await conn.end();
    process.exit(1);
  }
})();
