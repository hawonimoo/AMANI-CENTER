require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const runMigration = require("./migrate");

(async () => {
  let conn;
  try {
    // First run migration to ensure all columns/tables exist
    await runMigration();

    conn = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "org_management",
    });

    console.log("Connected to database. Starting comprehensive seed...");

    // Clear existing data safely
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query("TRUNCATE TABLE task_activities");
    await conn.query("TRUNCATE TABLE attendance");
    await conn.query("TRUNCATE TABLE leave_requests");
    await conn.query("TRUNCATE TABLE notifications");
    await conn.query("TRUNCATE TABLE announcements");
    await conn.query("TRUNCATE TABLE audit_logs");
    await conn.query("TRUNCATE TABLE daily_reports");
    await conn.query("TRUNCATE TABLE tasks");
    await conn.query("TRUNCATE TABLE program_members");
    await conn.query("TRUNCATE TABLE users");
    await conn.query("TRUNCATE TABLE programs");
    await conn.query("TRUNCATE TABLE hubs");
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    // 1. Insert Hubs
    const hubs = [
      ["Central Innovation Hub", "Headquarters coordinating regional strategy, executive oversight, and partnerships."],
      ["Mogadishu Digital Hub", "Focusing on community radio, media tech, digital hub training, and youth inclusion."],
      ["Hargeisa Operations Hub", "Leading climate resilience, local agriculture, water tracking, and micro-finance."],
    ];
    for (const [name, desc] of hubs) {
      await conn.query("INSERT INTO hubs (name, description) VALUES (?, ?)", [name, desc]);
    }
    const [hubsRows] = await conn.query("SELECT id, name FROM hubs");
    const hubMap = {};
    hubsRows.forEach((h) => (hubMap[h.name] = h.id));

    // 2. Insert Users
    const defaultPassHash = await bcrypt.hash("password123", 10);
    const adminPassHash = await bcrypt.hash("admin123", 10);

    const users = [
      ["Super Admin", "admin@org.com", adminPassHash, "admin", hubMap["Central Innovation Hub"], "+252-615-000001", "Chief Executive Officer"],
      ["Asha Warsame", "hub.leader@org.com", defaultPassHash, "hub_leader", hubMap["Mogadishu Digital Hub"], "+252-615-000002", "Mogadishu Regional Director"],
      ["Mohamed Ali", "radio.leader@org.com", defaultPassHash, "program_leader", hubMap["Mogadishu Digital Hub"], "+252-615-000003", "Broadcast Lead Producer"],
      ["Khadija Nur", "climate.leader@org.com", defaultPassHash, "program_leader", hubMap["Hargeisa Operations Hub"], "+252-634-000004", "Climate & Water Lead"],
      ["Amina Farah", "amina.staff@org.com", defaultPassHash, "staff", hubMap["Mogadishu Digital Hub"], "+252-615-000005", "Senior Audio Journalist"],
      ["Hassan Abdi", "hassan.staff@org.com", defaultPassHash, "staff", hubMap["Hargeisa Operations Hub"], "+252-634-000006", "Field Agriculture Officer"],
      ["Farah Jama", "farah.staff@org.com", defaultPassHash, "staff", hubMap["Central Innovation Hub"], "+252-615-000007", "M&E Data Analyst"],
    ];

    for (const [name, email, pass, role, hubId, phone, jobTitle] of users) {
      await conn.query(
        "INSERT INTO users (name, email, password_hash, role, hub_id, phone, job_title, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
        [name, email, pass, role, hubId, phone, jobTitle]
      );
    }
    const [userRows] = await conn.query("SELECT id, email FROM users");
    const userMap = {};
    userRows.forEach((u) => (userMap[u.email] = u.id));

    // 3. Insert Programs with Leader IDs
    const programs = [
      ["Radio Broadcast & Community Media", "Community radio production, civic engagement broadcasts, and public education.", hubMap["Mogadishu Digital Hub"], userMap["radio.leader@org.com"]],
      ["Climate Change Adaptation & Resilience", "Drought tracking, sustainable community agriculture, and water management programs.", hubMap["Hargeisa Operations Hub"], userMap["climate.leader@org.com"]],
      ["Digital Skills & Youth Innovation", "Software engineering training, youth mentorship, and local hackathons.", hubMap["Mogadishu Digital Hub"], userMap["hub.leader@org.com"]],
      ["Micro-Finance & Livelihoods", "Small business grants, financial literacy, and savings groups.", hubMap["Hargeisa Operations Hub"], userMap["climate.leader@org.com"]],
      ["Program Management & Monitoring", "Cross-program evaluation, M&E reporting, and impact audits.", hubMap["Central Innovation Hub"], userMap["admin@org.com"]],
    ];
    for (const [name, desc, hubId, leaderId] of programs) {
      await conn.query(
        "INSERT INTO programs (name, description, hub_id, leader_id, status) VALUES (?, ?, ?, ?, 'active')",
        [name, desc, hubId, leaderId]
      );
    }
    const [progRows] = await conn.query("SELECT id, name FROM programs");
    const progMap = {};
    progRows.forEach((p) => (progMap[p.name] = p.id));

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

    // 5. Insert Tasks with Priorities and Due Dates
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
        "urgent",
        plusDays(2),
        "in_progress",
      ],
      [
        progMap["Radio Broadcast & Community Media"],
        userMap["amina.staff@org.com"],
        userMap["radio.leader@org.com"],
        "Schedule Weekly Radio Frequency Transmissions",
        "Coordinate with broadcast engineer to verify transmission tower logs and signal quality.",
        "high",
        plusDays(5),
        "pending",
      ],
      [
        progMap["Radio Broadcast & Community Media"],
        userMap["amina.staff@org.com"],
        userMap["radio.leader@org.com"],
        "Transcribe Listener Feedback Hotline",
        "Summarize listener voice notes from SMS hotline into monthly report sheet.",
        "medium",
        plusDays(-1),
        "completed",
      ],
      [
        progMap["Climate Change Adaptation & Resilience"],
        userMap["hassan.staff@org.com"],
        userMap["climate.leader@org.com"],
        "Inspect Borehole Sensor Telemetry",
        "Verify water level telemetry IoT sensors installed across 4 test sites.",
        "urgent",
        plusDays(3),
        "in_progress",
      ],
      [
        progMap["Climate Change Adaptation & Resilience"],
        userMap["hassan.staff@org.com"],
        userMap["climate.leader@org.com"],
        "Draft Rain Harvesting Community Training Manual",
        "Prepare Somali and English slides for local farmer co-op training.",
        "low",
        plusDays(7),
        "pending",
      ],
      [
        progMap["Program Management & Monitoring"],
        userMap["farah.staff@org.com"],
        userMap["admin@org.com"],
        "Compile Q3 Program Impact Indicators",
        "Consolidate daily report logs across all 5 programs into quarterly executive summary.",
        "high",
        plusDays(4),
        "in_progress",
      ],
    ];

    for (const [pId, toId, byId, title, desc, prio, dueDate, status] of tasks) {
      if (pId && toId && byId) {
        const [res] = await conn.query(
          "INSERT INTO tasks (program_id, assigned_to, assigned_by, title, description, priority, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [pId, toId, byId, title, desc, prio, dueDate, status]
        );
        // Add activity
        await conn.query(
          "INSERT INTO task_activities (task_id, user_id, action, comment) VALUES (?, ?, 'created', 'Task initialized and delegated')",
          [res.insertId, byId]
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

    // 7. Insert Attendance Records (Today & Yesterday)
    const attendanceData = [
      [userMap["amina.staff@org.com"], minusDays(0), "08:25:00", null, "present", "On-time arrival at Mogadishu studio."],
      [userMap["amina.staff@org.com"], minusDays(1), "08:30:00", "17:05:00", "present", "Normal working hours."],
      [userMap["hassan.staff@org.com"], minusDays(0), "08:15:00", null, "present", "Arrived for Hargeisa site review."],
      [userMap["hassan.staff@org.com"], minusDays(1), "09:20:00", "17:15:00", "late", "Vehicle delay during field transit."],
      [userMap["farah.staff@org.com"], minusDays(0), "08:45:00", null, "present", "Central HQ morning reporting."],
    ];

    for (const [uid, adate, cin, cout, st, notes] of attendanceData) {
      if (uid) {
        await conn.query(
          `INSERT INTO attendance (user_id, attendance_date, check_in_time, check_out_time, status, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uid, adate, cin, cout, st, notes]
        );
      }
    }

    // 8. Insert Leave Requests
    const leaves = [
      [userMap["amina.staff@org.com"], "annual", plusDays(10), plusDays(14), "Family bereavement and annual leave.", "pending", null, null],
      [userMap["hassan.staff@org.com"], "sick", minusDays(5), minusDays(4), "Severe malaria recovery.", "approved", userMap["climate.leader@org.com"], "Approved. Doctor certificate verified."],
    ];

    for (const [uid, ltype, sdate, edate, reason, st, revBy, comm] of leaves) {
      if (uid) {
        await conn.query(
          `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, status, reviewed_by, leader_comment)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uid, ltype, sdate, edate, reason, st, revBy, comm]
        );
      }
    }

    // 9. Insert Notifications
    const notifs = [
      [userMap["amina.staff@org.com"], "New Task Assigned", "Mohamed Ali assigned you: Record Community Health Radio Episode #42", "task_assigned", "#tasks"],
      [userMap["amina.staff@org.com"], "Report Reviewed", "Mohamed Ali reviewed your daily report with positive feedback.", "report_reviewed", "#reports"],
      [userMap["hassan.staff@org.com"], "Leave Request Approved", "Your sick leave request was approved by Khadija Nur.", "leave_status", "#attendance"],
      [userMap["farah.staff@org.com"], "Report Needs Clarification", "Super Admin requested adjustments on your M&E report.", "report_reviewed", "#reports"],
    ];

    for (const [uid, title, msg, ntype, link] of notifs) {
      if (uid) {
        await conn.query(
          `INSERT INTO notifications (user_id, title, message, type, link, is_read)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [uid, title, msg, ntype, link]
        );
      }
    }

    // 10. Audit Log Initial Event
    await conn.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'SYSTEM_INITIALIZED', 'system', 1, 'Full database schema verified and seed data populated.')`,
      [userMap["admin@org.com"]]
    );

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
