const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware");

const router = express.Router();

// GET /api/notifications - List user's notifications
router.get("/", authRequired, async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch notifications." });
  }
});

// PATCH /api/notifications/:id/read - Mark one notification as read
router.patch("/:id/read", authRequired, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [notifId, req.user.id]
    );
    res.json({ success: true, message: "Marked as read." });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ success: false, error: "Failed to update notification." });
  }
});

// PATCH /api/notifications/read-all - Mark all user notifications as read
router.patch("/read-all", authRequired, async (req, res) => {
  try {
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ success: false, error: "Failed to mark notifications." });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    await db.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [notifId, req.user.id]);
    res.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ success: false, error: "Failed to delete notification." });
  }
});

module.exports = router;
