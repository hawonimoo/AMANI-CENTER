require("dotenv").config();
const mysql = require("mysql2/promise");

async function runMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "org_management",
    multipleStatements: true,
  });

  console.log("Connected to MySQL. Running safe migration...");

  try {
    // Helper to safely add column if not exists
    async function addColumnIfNotExists(table, column, def) {
      const [rows] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME || "org_management", table, column]
      );
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
        console.log(`+ Added column ${column} to ${table}`);
      } else {
        console.log(`= Column ${column} already exists in ${table}`);
      }
    }

    // 1. Extend tasks table
    await addColumnIfNotExists("tasks", "priority", "ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium'");
    await addColumnIfNotExists("tasks", "completion_notes", "TEXT NULL");
    await addColumnIfNotExists("tasks", "completed_at", "TIMESTAMP NULL");

    // 2. Extend users table
    await addColumnIfNotExists("users", "phone", "VARCHAR(50) NULL");
    await addColumnIfNotExists("users", "job_title", "VARCHAR(100) NULL");

    // 3. Extend programs table
    await addColumnIfNotExists("programs", "leader_id", "INT NULL");
    await addColumnIfNotExists("programs", "status", "ENUM('active','paused','completed') NOT NULL DEFAULT 'active'");

    // 4. Create task_activities table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS task_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        comment TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task (task_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: task_activities");

    // 5. Create attendance table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        attendance_date DATE NOT NULL,
        check_in_time TIME NULL,
        check_out_time TIME NULL,
        status ENUM('present','late','half_day','absent') NOT NULL DEFAULT 'present',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_daily_attendance (user_id, attendance_date),
        INDEX idx_att_date (attendance_date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: attendance");

    // 6. Create leave_requests table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        leave_type ENUM('annual','sick','personal','maternity','emergency') NOT NULL DEFAULT 'annual',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewed_by INT NULL,
        leader_comment TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_leave_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: leave_requests");

    // 7. Create notifications table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('task_assigned','task_status','report_submitted','report_reviewed','announcement','leave_status','general') NOT NULL DEFAULT 'general',
        link VARCHAR(255) NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user_unread (user_id, is_read),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: notifications");

    // 8. Create announcements table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        priority ENUM('normal','important','urgent') NOT NULL DEFAULT 'normal',
        target_role ENUM('all','leaders','staff') NOT NULL DEFAULT 'all',
        hub_id INT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ann_hub (hub_id),
        FOREIGN KEY (hub_id) REFERENCES hubs(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: announcements");

    // 9. Create audit_logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_created (created_at DESC),
        INDEX idx_audit_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: audit_logs");

    // 10. Create system_settings table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Verified table: system_settings");

    // Populate default system settings if empty
    const [settings] = await conn.query("SELECT COUNT(*) as cnt FROM system_settings");
    if (settings[0].cnt === 0) {
      await conn.query(`
        INSERT INTO system_settings (setting_key, setting_value) VALUES
        ('org_name', 'OrgFlow International'),
        ('reporting_deadline_hour', '17:00'),
        ('attendance_late_threshold', '09:15'),
        ('allow_staff_export', 'false'),
        ('system_announcement', 'Welcome to the updated OrgFlow multi-hub management system.')
      `);
      console.log("+ Inserted default system settings");
    }

    // Populate sample announcements if none exist
    const [annCount] = await conn.query("SELECT COUNT(*) as cnt FROM announcements");
    if (annCount[0].cnt === 0) {
      const [admin] = await conn.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (admin.length > 0) {
        await conn.query(`
          INSERT INTO announcements (title, content, priority, target_role, created_by) VALUES
          ('Q4 Operational Alignment Meeting', 'All hub leaders and program managers are scheduled for the monthly strategic sync on Monday at 09:00 AM.', 'important', 'leaders', ?),
          ('Daily Reporting Reminder', 'Please ensure all work logs are submitted prior to 5:00 PM local time to assist coordinators with regional rollups.', 'normal', 'all', ?)
        `, [admin[0].id, admin[0].id]);
        console.log("+ Inserted starter announcements");
      }
    }

    // Assign program leader IDs in programs table if not set
    const [radioLeader] = await conn.query("SELECT id FROM users WHERE email = 'radio.leader@org.com'");
    const [climateLeader] = await conn.query("SELECT id FROM users WHERE email = 'climate.leader@org.com'");
    if (radioLeader.length > 0) {
      await conn.query("UPDATE programs SET leader_id = ? WHERE name LIKE '%Radio%'", [radioLeader[0].id]);
    }
    if (climateLeader.length > 0) {
      await conn.query("UPDATE programs SET leader_id = ? WHERE name LIKE '%Climate%'", [climateLeader[0].id]);
    }

    console.log("Migration executed successfully!");
    await conn.end();
  } catch (err) {
    console.error("Migration failed:", err);
    await conn.end();
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
