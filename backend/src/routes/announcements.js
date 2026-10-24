const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly, adminOnly } = require("../middleware");
const { logAudit } = require("../utils/audit");
const { broadcastNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/announcements - List visible announcements
router.get("/", authRequired, async (req, res) => {
  try {
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);

    let query = `
      SELECT 
        a.*,
        u.name AS author_name,
        u.role AS author_role,
        h.name AS hub_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      LEFT JOIN hubs h ON a.hub_id = h.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by visibility unless admin
    if (req.user.role !== "admin") {
      query += ` AND (a.hub_id IS NULL OR a.hub_id = ?)`;
      params.push(req.user.hub_id);

      if (!isLeader) {
        query += ` AND a.target_role IN ('all', 'staff')`;
      }
    }

    query += ` ORDER BY FIELD(a.priority, 'urgent', 'important', 'normal'), a.created_at DESC LIMIT 50`;

    const [announcements] = await db.query(query, params);
    res.json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    console.error("Fetch announcements error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch announcements." });
  }
});

// POST /api/announcements - Broadcast announcement (Leaders/Admin)
router.post("/", authRequired, leaderOnly, async (req, res) => {
  try {
    let { title, content, priority = "normal", target_role = "all", hub_id = null } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: "Title and content are required." });
    }

    // Hub leader can only broadcast to their hub
    if (req.user.role === "hub_leader") {
      hub_id = req.user.hub_id;
    }

    const [result] = await db.query(
      `INSERT INTO announcements (title, content, priority, target_role, hub_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), content.trim(), priority, target_role, hub_id || null, req.user.id]
    );

    const announcementId = result.insertId;

    // Broadcast in-app notifications
    await broadcastNotification({
      hubId: hub_id || null,
      role: target_role,
      title: `Announcement: ${title.trim()}`,
      message: content.length > 90 ? `${content.slice(0, 90)}...` : content,
      type: "announcement",
      link: "#announcements",
    });

    await logAudit(req, "CREATE_ANNOUNCEMENT", "announcement", announcementId, {
      title,
      priority,
      target_role,
    });

    res.status(201).json({
      success: true,
      message: "Announcement broadcasted successfully.",
      announcementId,
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ success: false, error: "Failed to broadcast announcement." });
  }
});

// DELETE /api/announcements/:id - Delete announcement
router.delete("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const annId = parseInt(req.params.id, 10);
    const [existing] = await db.query("SELECT created_by FROM announcements WHERE id = ?", [annId]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Announcement not found." });
    }

    if (existing[0].created_by !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only the author or administrator can delete this announcement." });
    }

    await db.query("DELETE FROM announcements WHERE id = ?", [annId]);
    await logAudit(req, "DELETE_ANNOUNCEMENT", "announcement", annId, `Deleted announcement ${annId}`);

    res.json({ success: true, message: "Announcement removed." });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ success: false, error: "Failed to delete announcement." });
  }
});

module.exports = router;
