require("dotenv").config();
const mysql = require("mysql2/promise");

async function runAmaniMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "org_management",
    multipleStatements: true,
  });

  console.log("Connected to MySQL for Amani Center CBO migration...");

  try {
    // 1. Radio Schedules table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS radio_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_title VARCHAR(150) NOT NULL,
        presenters VARCHAR(255) NOT NULL,
        time_slot VARCHAR(100) NOT NULL,
        time_period_status ENUM('unconfirmed','AM','PM') NOT NULL DEFAULT 'unconfirmed',
        day_of_week VARCHAR(100) NOT NULL DEFAULT 'Monday - Sunday',
        is_overlap_flagged BOOLEAN NOT NULL DEFAULT FALSE,
        overlap_notes TEXT NULL,
        status ENUM('active','review_needed','suspended') NOT NULL DEFAULT 'active',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_radio_time (time_slot),
        INDEX idx_radio_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: radio_schedules");

    // 2. Radio Handover Logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS radio_handovers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shift_date DATE NOT NULL,
        time_slot VARCHAR(100) NOT NULL,
        outgoing_presenter VARCHAR(150) NOT NULL,
        incoming_presenter VARCHAR(150) NOT NULL,
        equipment_status VARCHAR(100) NOT NULL DEFAULT 'Operational',
        transmission_notes TEXT NULL,
        handover_notes TEXT NOT NULL,
        logged_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_handover_date (shift_date),
        FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: radio_handovers");

    // 3. Social Media & Communications
    await conn.query(`
      CREATE TABLE IF NOT EXISTS social_media_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content_caption TEXT NOT NULL,
        platforms VARCHAR(255) NOT NULL,
        target_date DATE NOT NULL,
        status ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
        coordinator VARCHAR(150) NOT NULL DEFAULT 'Elvis',
        department_source VARCHAR(150) NOT NULL DEFAULT 'Organization-wide',
        live_post_url VARCHAR(500) NULL,
        reach_count INT NOT NULL DEFAULT 0,
        engagement_count INT NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_post_date (target_date),
        INDEX idx_post_status (status),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: social_media_posts");

    // 4. Finance Transactions (Zero initial records as required)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('income','expense') NOT NULL,
        category VARCHAR(100) NOT NULL,
        program_id INT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'KES',
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        receipt_reference VARCHAR(150) NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        recorded_by INT NOT NULL,
        approved_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_date (transaction_date),
        INDEX idx_fin_type (type),
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: finance_transactions");

    // 5. Climate Activities
    await conn.query(`
      CREATE TABLE IF NOT EXISTS climate_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        target_date DATE NOT NULL,
        location VARCHAR(200) NOT NULL,
        lead_officer VARCHAR(100) NOT NULL DEFAULT 'Maua',
        target_participants INT NOT NULL DEFAULT 0,
        actual_participants INT NOT NULL DEFAULT 0,
        trees_planted INT NOT NULL DEFAULT 0,
        status ENUM('planned','ongoing','completed','cancelled') NOT NULL DEFAULT 'planned',
        outcomes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_clim_date (target_date),
        INDEX idx_clim_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: climate_activities");

    // 6. Digital Hub Cohorts & Participants
    await conn.query(`
      CREATE TABLE IF NOT EXISTS digital_hub_cohorts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        track VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('active','upcoming','graduated') NOT NULL DEFAULT 'active',
        mentor_name VARCHAR(150) NULL,
        capacity INT NOT NULL DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: digital_hub_cohorts");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS digital_hub_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cohort_id INT NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        contact_email VARCHAR(150) NULL,
        contact_phone VARCHAR(50) NULL,
        attendance_rate INT NOT NULL DEFAULT 100,
        project_title VARCHAR(200) NULL,
        status ENUM('enrolled','completed','dropped') NOT NULL DEFAULT 'enrolled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cohort_id) REFERENCES digital_hub_cohorts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: digital_hub_participants");

    // 7. Field Work, Ideas & Challenges Collaboration Board (Accessible to whole organization)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS field_collaborations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        author_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        category ENUM('field_work','idea','challenge','success_story') NOT NULL DEFAULT 'field_work',
        program_id INT NULL,
        content TEXT NOT NULL,
        location VARCHAR(200) NULL,
        status ENUM('open','in_discussion','implemented','resolved') NOT NULL DEFAULT 'open',
        likes_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_collab_cat (category),
        INDEX idx_collab_status (status),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: field_collaborations");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS field_collaboration_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        author_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fcc_post (post_id),
        FOREIGN KEY (post_id) REFERENCES field_collaborations(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Table verified: field_collaboration_comments");

    console.log("Amani Center CBO migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  runAmaniMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runAmaniMigration;
