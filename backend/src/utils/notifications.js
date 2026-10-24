const db = require("../db");

/**
 * Dispatch an in-app notification to a user.
 */
async function createNotification({ userId, title, message, type = "general", link = null }) {
  try {
    if (!userId || !title || !message) return;

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, title.trim(), message.trim(), type, link]
    );
  } catch (err) {
    console.error("Create notification error:", err.message);
  }
}

/**
 * Dispatch a notification to all members of a specific program or all users.
 */
async function broadcastNotification({ programId, hubId, role, title, message, type = "announcement", link = null }) {
  try {
    let query = "SELECT id FROM users WHERE is_active = 1";
    const params = [];

    if (hubId) {
      query += " AND hub_id = ?";
      params.push(hubId);
    }
    if (role && role !== "all") {
      if (role === "leaders") {
        query += " AND role IN ('admin', 'hub_leader', 'program_leader')";
      } else {
        query += " AND role = ?";
        params.push(role);
      }
    }
    if (programId) {
      query += " AND id IN (SELECT user_id FROM program_members WHERE program_id = ?)";
      params.push(programId);
    }

    const [users] = await db.query(query, params);
    for (const u of users) {
      await createNotification({ userId: u.id, title, message, type, link });
    }
  } catch (err) {
    console.error("Broadcast notification error:", err.message);
  }
}

module.exports = { createNotification, broadcastNotification };
