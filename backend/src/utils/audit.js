const db = require("../db");

/**
 * Record an audit log entry for significant administrative or operational events.
 */
async function logAudit(req, action, entityType, entityId, details) {
  try {
    const userId = req && req.user ? req.user.id : null;
    const ipAddress = req ? req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null : null;
    const detailsStr = typeof details === "object" ? JSON.stringify(details) : (details || null);

    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId || null, detailsStr, ipAddress]
    );
  } catch (err) {
    console.error("Audit log recording error:", err.message);
  }
}

module.exports = { logAudit };
