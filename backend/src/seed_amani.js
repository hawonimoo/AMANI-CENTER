require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function seedAmaniCenter() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "org_management",
    multipleStatements: true,
  });

  console.log("Connected to MySQL. Seeding real Amani Center CBO structure...");

  try {
    const passwordHash = await bcrypt.hash("amani2026", 10);
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    // Disable foreign key checks temporarily for clean re-seeding
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    const tablesToClear = [
      "field_collaboration_comments",
      "field_collaborations",
      "task_activities",
      "tasks",
      "daily_reports",
      "attendance",
      "leave_requests",
      "notifications",
      "audit_logs",
      "announcements",
      "program_members",
      "programs",
      "hubs",
      "users",
      "radio_schedules",
      "radio_handovers",
      "social_media_posts",
      "finance_transactions",
      "climate_activities",
      "digital_hub_cohorts",
      "digital_hub_participants"
    ];

    for (const t of tablesToClear) {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Cleared existing tables.");

    // 1. Insert Hub (Singular Hub: KijijiConnect Digital Hub)
    await conn.query(
      `INSERT INTO hubs (id, name, description) VALUES (1, ?, ?)`,
      [
        "KijijiConnect Digital Hub",
        "Official hub and technology center for Amani Center CBO, serving community programs, training, and operations."
      ]
    );
    const hubId = 1;
    console.log("✓ Verified Hub: KijijiConnect Digital Hub");

    // 2. Insert Real Users List
    const usersToInsert = [
      // Boss / Executive Admin
      {
        id: 1,
        name: "John Green",
        email: "john.green@amanicenter.org",
        password_hash: passwordHash,
        role: "admin",
        hub_id: hubId,
        job_title: "Executive Director / The Boss",
        phone: "+254 700 000 001"
      },
      // Overall Project Manager of Everything in the CBO
      {
        id: 2,
        name: "Khavai Aghribina",
        email: "khavai@amanicenter.org",
        password_hash: passwordHash,
        role: "admin", // Executive privilege: John Green & Khavai view everything
        hub_id: hubId,
        job_title: "Overall Project Manager",
        phone: "+254 700 000 002"
      },
      // Vox Radio Station Manager
      {
        id: 3,
        name: "Maureen Buya",
        email: "maureen.buya@amanicenter.org",
        password_hash: passwordHash,
        role: "program_leader",
        hub_id: hubId,
        job_title: "Vox Radio Station Manager",
        phone: "+254 700 000 003"
      },
      // KijijiConnect Digital Hub Manager
      {
        id: 4,
        name: "Bob Wandati",
        email: "bob.wandati@amanicenter.org",
        password_hash: passwordHash,
        role: "program_leader",
        hub_id: hubId,
        job_title: "KijijiConnect Digital Hub Manager",
        phone: "+254 700 000 004"
      },
      // Finance Officer
      {
        id: 5,
        name: "Salma",
        email: "salma.finance@amanicenter.org",
        password_hash: passwordHash,
        role: "program_leader",
        hub_id: hubId,
        job_title: "Finance Officer",
        phone: "+254 700 000 005"
      },
      // Climate Change Program Lead
      {
        id: 6,
        name: "Maua",
        email: "maua@amanicenter.org",
        password_hash: passwordHash,
        role: "program_leader",
        hub_id: hubId,
        job_title: "Climate Change Program Lead",
        phone: "+254 700 000 006"
      },
      // Online & Social Media Communications
      {
        id: 7,
        name: "Elvis",
        email: "elvis.comms@amanicenter.org",
        password_hash: passwordHash,
        role: "staff",
        hub_id: hubId,
        job_title: "Online & Social Media Communications Officer",
        phone: "+254 700 000 007"
      },
      // Cross-Program Operations Staff (Nimoo Farah - does not rely on one program)
      {
        id: 8,
        name: "Nimoo Farah",
        email: "nimoo.farah@amanicenter.org",
        password_hash: passwordHash,
        role: "staff",
        hub_id: hubId,
        job_title: "Cross-Program Operations Officer",
        phone: "+254 700 000 008"
      },
      // Radio Presenter: Kula Nzomo (5 morning to saa nne = 5:00 AM - 10:00 AM)
      {
        id: 9,
        name: "Kula Nzomo",
        email: "kula.nzomo@amanicenter.org",
        password_hash: passwordHash,
        role: "staff",
        hub_id: hubId,
        job_title: "Morning Radio Presenter (05:00 – 10:00)",
        phone: "+254 700 000 009"
      },
      // Radio Presenter: Zaikun Abdulkarim (saa nne to saa nane = 10:00 AM - 2:00 PM)
      {
        id: 10,
        name: "Zaikun Abdulkarim",
        email: "zaikun@amanicenter.org",
        password_hash: passwordHash,
        role: "staff",
        hub_id: hubId,
        job_title: "Mid-day Radio Presenter (10:00 – 14:00)",
        phone: "+254 700 000 010"
      },
      // Radio Presenter: Yoash Festus (saa nane to saa kumi na moja = 2:00 PM - 5:00 PM)
      {
        id: 11,
        name: "Yoash Festus",
        email: "yoash@amanicenter.org",
        password_hash: passwordHash,
        role: "staff",
        hub_id: hubId,
        job_title: "Afternoon Radio Presenter (14:00 – 17:00)",
        phone: "+254 700 000 011"
      },
      // Radio Presenter: Yusuf Maro (saa kumi na mbili to saa nne usiku = 6:00 PM - 10:00 PM)
      {
        id: 12,
        name: "Yusuf Maro",
        email: "yusuf.maro@amanicenter.org",
        password_hash: passwordHash,
        role: "staff",
        hub_id: hubId,
        job_title: "Evening Radio Presenter (18:00 – 22:00)",
        phone: "+254 700 000 012"
      },
      // Technical Admin Account
      {
        id: 13,
        name: "Super Admin",
        email: "admin@amanicenter.org",
        password_hash: adminPasswordHash,
        role: "admin",
        hub_id: hubId,
        job_title: "System Administrator",
        phone: "+254 700 000 000"
      }
    ];

    for (const u of usersToInsert) {
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash, role, hub_id, job_title, phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [u.id, u.name, u.email, u.password_hash, u.role, u.hub_id, u.job_title, u.phone]
      );
    }
    console.log(`✓ Seeded ${usersToInsert.length} Amani Center CBO personnel.`);

    // 3. Insert Programs
    const programsToInsert = [
      {
        id: 1,
        hub_id: hubId,
        name: "Vox Radio Station",
        description: "Amani Center CBO community radio broadcast service, live shows, transmission, and civic programs.",
        leader_id: 3 // Maureen Buya
      },
      {
        id: 2,
        hub_id: hubId,
        name: "KijijiConnect Digital Hub",
        description: "Youth digital skills training cohorts, innovation labs, and community technology access.",
        leader_id: 4 // Bob Wandati
      },
      {
        id: 3,
        hub_id: hubId,
        name: "Climate Change Program",
        description: "Environmental resilience, indigenous tree planting campaigns, and water catchment management.",
        leader_id: 6 // Maua
      },
      {
        id: 4,
        hub_id: hubId,
        name: "Online & Social Media Communications",
        description: "Organization-wide digital presence, multi-platform publishing, live URLs, and community outreach.",
        leader_id: 7 // Elvis
      },
      {
        id: 5,
        hub_id: hubId,
        name: "Finance Department",
        description: "Financial vouchers, budgets, receipt audits, grant records, and expenditure approvals.",
        leader_id: 5 // Salma
      },
      {
        id: 6,
        hub_id: hubId,
        name: "Executive Management & Leadership",
        description: "Overall CBO project governance, executive oversight, and partner coordination.",
        leader_id: 2 // Khavai Aghribina & John Green
      }
    ];

    for (const p of programsToInsert) {
      await conn.query(
        `INSERT INTO programs (id, hub_id, name, description, leader_id, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [p.id, p.hub_id, p.name, p.description, p.leader_id]
      );
    }
    console.log("✓ Seeded 6 Amani Center CBO programs.");

    // 4. Assign Program Memberships
    // Note: Nimoo Farah (user 8) does not rely on one program -> assigned across all programs!
    const programMemberships = [
      // Vox Radio: Maureen Buya (leader), Kula Nzomo, Zaikun Abdulkarim, Yoash Festus, Yusuf Maro, Nimoo Farah
      [3, 1],
      [9, 1],
      [10, 1],
      [11, 1],
      [12, 1],
      [8, 1], // Nimoo Farah
      // Digital Hub: Bob Wandati (leader), Nimoo Farah
      [4, 2],
      [8, 2], // Nimoo Farah
      // Climate Change: Maua (leader), Nimoo Farah
      [6, 3],
      [8, 3], // Nimoo Farah
      // Online & Comms: Elvis (leader), Nimoo Farah
      [7, 4],
      [8, 4], // Nimoo Farah
      // Finance: Salma (leader), Nimoo Farah
      [5, 5],
      [8, 5], // Nimoo Farah
      // Executive Management: John Green, Khavai Aghribina
      [1, 6],
      [2, 6]
    ];

    for (const [userId, progId] of programMemberships) {
      await conn.query(
        `INSERT IGNORE INTO program_members (user_id, program_id) VALUES (?, ?)`,
        [userId, progId]
      );
    }
    console.log("✓ Assigned program memberships (including Nimoo Farah cross-program).");

    // 5. Seed Real Radio Schedules with Confirmed Swahili Hours
    await conn.query(
      `INSERT INTO radio_schedules 
        (program_title, presenters, time_slot, time_period_status, day_of_week, is_overlap_flagged, overlap_notes, status, notes)
       VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        // Slot 1: Kula Nzomo (5 morning to saa nne = 05:00 - 10:00)
        "Kumekucha Sunrise Show (Kula Nzomo)",
        "Kula Nzomo",
        "05:00 – 10:00 (5:00 Asubuhi – Saa Nne)",
        "AM",
        "Monday - Friday",
        0,
        null,
        "active",
        "Morning prime show: community news, sunrise motivation, and local farmer alerts with Kula Nzomo.",

        // Slot 2: Zaikun Abdulkarim (saa nne to saa nane = 10:00 - 14:00)
        "Mid-day Connection & Social Voices",
        "Zaikun Abdulkarim",
        "10:00 – 14:00 (Saa Nne – Saa Nane Mchana)",
        "AM",
        "Monday - Friday",
        0,
        null,
        "active",
        "Mid-day civic discussions, healthcare awareness, and interactive call-ins with Zaikun Abdulkarim.",

        // Slot 3: Yoash Festus (saa nane to saa kumi na moja = 14:00 - 17:00)
        "Afternoon Youth Drive & Innovation Pulse",
        "Yoash Festus",
        "14:00 – 17:00 (Saa Nane – Saa Kumi na Moja Jioni)",
        "PM",
        "Monday - Friday",
        0,
        null,
        "active",
        "Youth entertainment, digital hub technology updates, and local talent showcases with Yoash Festus.",

        // Slot 4: Yusuf Maro (saa kumi na mbili to saa nne usiku = 18:00 - 22:00)
        "Night Breeze & Community Dialogue",
        "Yusuf Maro",
        "18:00 – 22:00 (Saa Kumi na Mbili – Saa Nne Usiku)",
        "PM",
        "Monday - Friday",
        0,
        null,
        "active",
        "Evening community recap, peaceful dialogue, development roundtable, and listener dedications with Yusuf Maro."
      ]
    );
    console.log("✓ Seeded confirmed radio broadcast schedule with Swahili time slots.");

    // 6. Seed Radio Handover Record
    await conn.query(
      `INSERT INTO radio_handovers 
        (shift_date, time_slot, outgoing_presenter, incoming_presenter, equipment_status, transmission_notes, handover_notes, logged_by)
       VALUES 
        (CURDATE(), '10:00 Handover', 'Kula Nzomo', 'Zaikun Abdulkarim', 'Studio Mic 1 & Transmitter 100% OK', 'Signal clarity normal on 98.4 MHz.', 'Morning community call-ins logged. Handed mixer to Zaikun Abdulkarim.', 9)`
    );
    console.log("✓ Seeded radio handover log.");

    // 7. Seed Social Media Posts (Elvis)
    await conn.query(
      `INSERT INTO social_media_posts 
        (title, content_caption, platforms, target_date, status, coordinator, department_source, live_post_url, reach_count, engagement_count, created_by)
       VALUES 
        (?, ?, ?, CURDATE(), 'scheduled', ?, ?, ?, 1850, 240, 7),
        (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'draft', ?, ?, ?, 0, 0, 7)`,
      [
        "Vox Radio Morning Drive with Kula Nzomo",
        "Tune in to Vox Radio from 5:00 AM to 10:00 AM as Kula Nzomo brings community voices, local stories, and development news live! Call in to participate. #AmaniCenter #VoxRadio",
        "Facebook, X, Instagram",
        "Elvis",
        "Vox Radio Station",
        "https://facebook.com/amanicenter/posts/live-broadcast-today",

        "KijijiConnect Digital Hub Cohort Applications Open",
        "Applications are open for youth and community members to join our practical digital skills training at KijijiConnect Digital Hub under Bob Wandati. #KijijiConnect #DigitalSkills #AmaniCenter",
        "Facebook, Instagram, LinkedIn, TikTok",
        "Elvis",
        "KijijiConnect Digital Hub",
        null
      ]
    );
    console.log("✓ Seeded social media posts.");

    // 8. Finance Transactions: MUST BE ZERO AS INSTRUCTED
    console.log("✓ Verified: finance_transactions table remains empty (0 initial transactions).");

    // 9. Climate Activities (Maua)
    await conn.query(
      `INSERT INTO climate_activities
        (title, activity_type, target_date, location, lead_officer, target_participants, actual_participants, trees_planted, status, outcomes)
       VALUES
        (?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?, ?, 80, 0, 0, 'planned', ?),
        (?, ?, DATE_SUB(CURDATE(), INTERVAL 3 DAY), ?, ?, 50, 65, 400, 'completed', ?)`,
      [
        "Community Agroforestry & Indigenous Seedling Drive",
        "Tree Planting",
        "Kili Foothills Community Lands",
        "Maua",
        "Distribution of 1,000 indigenous drought-resistant seedlings to local farmer cooperatives.",

        "Community Water Catchment Resilience Workshop",
        "Community Outreach",
        "Amani Center Main Hall",
        "Maua",
        "65 local farmers and community leaders attended. 400 seedlings planted near the water spring."
      ]
    );
    console.log("✓ Seeded climate activities.");

    // 10. Digital Hub Cohorts & Participants (Bob Wandati)
    const [c1Res] = await conn.query(
      `INSERT INTO digital_hub_cohorts (name, track, start_date, end_date, status, mentor_name, capacity)
       VALUES 
        (?, ?, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'active', ?, 30),
        (?, ?, DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'upcoming', ?, 25)`,
      [
        "Cohort 1: Digital Literacy & Applied Tools",
        "Digital Literacy & Web Tools",
        "Bob Wandati",
        "Cohort 2: Web Design & Freelance Media",
        "Web Design & Media",
        "Bob Wandati & Nimoo Farah"
      ]
    );
    const c1Id = c1Res.insertId;

    await conn.query(
      `INSERT INTO digital_hub_participants 
        (cohort_id, full_name, contact_email, contact_phone, attendance_rate, project_title, status)
       VALUES
        (?, 'Faith Nduta', 'faith.nduta@example.com', '+254 711 111 001', 95, 'Community Clinic Online Registry', 'enrolled'),
        (?, 'Brian Ochieng', 'brian.o@example.com', '+254 711 111 002', 100, 'Kili Farm Produce Directory', 'enrolled'),
        (?, 'Mercy Chebet', 'mercy.c@example.com', '+254 711 111 003', 92, 'Local Artisan Digital Portfolio', 'enrolled')`,
      [c1Id, c1Id, c1Id]
    );
    console.log("✓ Seeded digital hub cohorts & participants.");

    // 11. Seed Initial Tasks
    const tasksToInsert = [
      {
        title: "Review Morning Broadcast Audio Logs & Sound Engineering",
        desc: "Check transmitter levels and audio leveling for Kula Nzomo and Zaikun Abdulkarim slots.",
        prog_id: 1,
        assigned_to: 3, // Maureen Buya
        assigned_by: 2, // Khavai Aghribina
        due_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        priority: "high",
        status: "in_progress"
      },
      {
        title: "Coordinate Lab Workstation Readiness for Cohort 1",
        desc: "Ensure all 25 computers have the necessary web design tools and offline learning materials loaded.",
        prog_id: 2,
        assigned_to: 4, // Bob Wandati
        assigned_by: 2, // Khavai Aghribina
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        priority: "medium",
        status: "completed"
      },
      {
        title: "Prepare Logistics for Indigenous Seedling Delivery",
        desc: "Finalize logistics for seedling transport to Kili Foothills Community Lands.",
        prog_id: 3,
        assigned_to: 6, // Maua
        assigned_by: 2, // Khavai Aghribina
        due_date: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0],
        priority: "high",
        status: "in_progress"
      },
      {
        title: "Social Media Campaign for Tree Planting Initiative",
        desc: "Draft informative graphics and captions highlighting climate resilience in the community.",
        prog_id: 4,
        assigned_to: 7, // Elvis
        assigned_by: 2, // Khavai Aghribina
        due_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        priority: "medium",
        status: "pending"
      },
      {
        title: "Support Multi-Program Cross-Coordination & Material Distribution",
        desc: "Assist Vox Radio studio and KijijiConnect Hub with weekly materials and participant check-in registers.",
        prog_id: 1,
        assigned_to: 8, // Nimoo Farah
        assigned_by: 2, // Khavai Aghribina
        due_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        priority: "medium",
        status: "in_progress"
      }
    ];

    for (const t of tasksToInsert) {
      await conn.query(
        `INSERT INTO tasks (title, description, program_id, assigned_to, assigned_by, due_date, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.title, t.desc, t.prog_id, t.assigned_to, t.assigned_by, t.due_date, t.priority, t.status]
      );
    }
    console.log("✓ Seeded initial tasks.");

    // 12. Seed Daily Accountability Reports for Everyone (Managers & Staff)
    // Structure: what they did today (work_done), challenges faced (challenges), next steps (next_steps)
    const reportsToInsert = [
      {
        user_id: 3, // Maureen Buya (Vox Radio Manager)
        program_id: 1,
        report_date: new Date().toISOString().split("T")[0],
        work_done: "Supervised morning show broadcast transition from Kula Nzomo to Zaikun Abdulkarim. Reviewed studio equipment condition.",
        challenges: "Slight audio clipping detected on Mic 2 during community phone-in segment.",
        next_steps: "Recalibrate audio compressor before the 14:00 afternoon drive with Yoash Festus.",
        status: "submitted"
      },
      {
        user_id: 4, // Bob Wandati (Hub Manager)
        program_id: 2,
        report_date: new Date().toISOString().split("T")[0],
        work_done: "Facilitated Module 3 for Cohort 1 learners on practical web tools. 22 youth attended in person.",
        challenges: "Two desktop monitors require replacement VGA cables.",
        next_steps: "Source replacement cables and prepare student mini-project assignments for next week.",
        status: "reviewed"
      },
      {
        user_id: 6, // Maua (Climate Lead)
        program_id: 3,
        report_date: new Date().toISOString().split("T")[0],
        work_done: "Met with local elders and forestry nursery committee to inspect 1,000 indigenous drought-tolerant seedlings.",
        challenges: "Transportation truck availability confirmed only for Friday morning.",
        next_steps: "Notify community farm leaders of the Friday delivery schedule.",
        status: "submitted"
      },
      {
        user_id: 7, // Elvis (Online & Social Media)
        program_id: 4,
        report_date: new Date().toISOString().split("T")[0],
        work_done: "Published Facebook and X alert for Vox Radio morning show. Drafted upcoming promotion for KijijiConnect Hub Cohort 2.",
        challenges: "Awaiting final high-resolution photos from the climate seedling workshop.",
        next_steps: "Schedule Instagram stories and analyze audience engagement metrics.",
        status: "reviewed"
      },
      {
        user_id: 8, // Nimoo Farah (Cross-Program Staff)
        program_id: 1,
        report_date: new Date().toISOString().split("T")[0],
        work_done: "Assisted Vox Radio studio reception with incoming listener calls, then supported KijijiConnect Digital Hub learner attendance check-in.",
        challenges: "Heavy influx of listener callers during 08:00 AM agricultural segment.",
        next_steps: "Organize call-in topic sheet for tomorrow morning's show.",
        status: "reviewed"
      },
      {
        user_id: 9, // Kula Nzomo (Morning Presenter)
        program_id: 1,
        report_date: new Date().toISOString().split("T")[0],
        work_done: "Hosted Kumekucha Sunrise Show on Vox Radio from 05:00 to 10:00 AM. Covered local news, weather, and agricultural updates.",
        challenges: "None. Broadcast ran smoothly.",
        next_steps: "Prepare guest interview script for Thursday morning broadcast.",
        status: "reviewed"
      }
    ];

    for (const r of reportsToInsert) {
      await conn.query(
        `INSERT INTO daily_reports (user_id, program_id, report_date, work_done, challenges, next_steps, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.user_id, r.program_id, r.report_date, r.work_done, r.challenges, r.next_steps, r.status]
      );
    }
    console.log("✓ Seeded daily accountability reports for staff & managers.");

    // 13. Seed Field Collaboration & Ideas Board
    const [cPost1] = await conn.query(
      `INSERT INTO field_collaborations (author_id, title, category, program_id, content, location, status, likes_count)
       VALUES (?, ?, 'field_work', 3, ?, ?, 'in_discussion', 6)`,
      [
        6, // Maua
        "Kili Foothills Water Catchment Assessment & Community Mapping",
        "Completed direct soil and water spring inspections with 4 local farmer cooperatives. We identified 3 key planting points for the upcoming indigenous tree buffer zone.",
        "Kili Foothills Community Ward"
      ]
    );

    const [cPost2] = await conn.query(
      `INSERT INTO field_collaborations (author_id, title, category, program_id, content, location, status, likes_count)
       VALUES (?, ?, 'success_story', 2, ?, ?, 'implemented', 12)`,
      [
        4, // Bob Wandati
        "KijijiConnect Digital Hub Lab Workstations Commissioned Successfully",
        "All 25 student computers have been configured with high-speed internet and development environments. Cohort 1 learners are already executing their first applied projects!",
        "KijijiConnect Digital Hub Lab"
      ]
    );

    const [cPost3] = await conn.query(
      `INSERT INTO field_collaborations (author_id, title, category, program_id, content, location, status, likes_count)
       VALUES (?, ?, 'challenge', 1, ?, ?, 'open', 3)`,
      [
        3, // Maureen Buya
        "Power Fluctuations at Vox Radio Transmission Tower during Rain",
        "During last night's evening broadcast, brief power dips were noticed near the transmitter. Let's discuss adding a dedicated solar inverter backup to protect live transmission.",
        "Vox Radio Broadcast Tower"
      ]
    );

    const [cPost4] = await conn.query(
      `INSERT INTO field_collaborations (author_id, title, category, program_id, content, location, status, likes_count)
       VALUES (?, ?, 'idea', 4, ?, ?, 'in_discussion', 8)`,
      [
        7, // Elvis
        "Live Video Podcast Clips from Vox Radio Studio on Social Media",
        "Proposal to record engaging 2-minute video snippets of Kula Nzomo, Zaikun, Yoash, and Yusuf discussing popular topics, and publish them on TikTok & Instagram Reels to expand youth reach.",
        "Vox Radio Studio & Online"
      ]
    );

    // Comments on field posts
    await conn.query(
      `INSERT INTO field_collaboration_comments (post_id, author_id, comment)
       VALUES
        (?, 2, 'Excellent fieldwork Maua! Let us coordinate with the transport team so the seedling delivery aligns with the farmers schedule.'),
        (?, 1, 'Great milestone Bob. Let us ensure every youth in Cohort 1 builds a real community solution by graduation.'),
        (?, 5, 'Regarding the solar backup Maureen, we can allocate funds from the equipment maintenance line once the quote is submitted.'),
        (?, 9, 'Awesome idea Elvis! I can easily do a 1-minute morning show teaser video every day at 06:00 AM.')`,
      [cPost1.insertId, cPost2.insertId, cPost3.insertId, cPost4.insertId]
    );
    console.log("✓ Seeded Field Work, Ideas & Challenges Collaboration Board.");

    // 14. System Settings
    await conn.query(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES 
        ('org_name', 'Amani Center CBO'),
        ('color_theme', 'black_red_white'),
        ('executive_director', 'John Green'),
        ('project_manager', 'Khavai Aghribina'),
        ('hub_name', 'KijijiConnect Digital Hub'),
        ('radio_station', 'Vox Radio Station')
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
    `);
    console.log("✓ Seeded system settings for Amani Center CBO.");

    console.log("\n=======================================================");
    console.log("Amani Center CBO database setup successfully completed!");
    console.log("Executive Admins: John Green & Khavai Aghribina (view everything)");
    console.log("Managers: Maureen Buya, Bob Wandati, Salma, Maua");
    console.log("Staff: Elvis, Nimoo Farah, Kula Nzomo, Zaikun, Yoash, Yusuf");
    console.log("Password for all personnel: amani2026");
    console.log("=======================================================");
  } catch (err) {
    console.error("Seeding error:", err);
    throw err;
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  seedAmaniCenter()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedAmaniCenter;
