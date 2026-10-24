const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired } = require("../middleware");

// GET /api/comms/posts - Fetch social media content calendar
router.get("/posts", authRequired, async (req, res) => {
  try {
    const { status, platform, department } = req.query;
    let query = `
      SELECT p.*, u.name as author_name
      FROM social_media_posts p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }
    if (platform) {
      query += " AND p.platforms LIKE ?";
      params.push(`%${platform}%`);
    }
    if (department) {
      query += " AND p.department_source = ?";
      params.push(department);
    }

    query += " ORDER BY p.target_date DESC, p.id DESC";

    const [rows] = await db.query(query, params);

    // Aggregate stats
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_posts,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_posts,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_posts,
        COALESCE(SUM(reach_count), 0) as total_reach,
        COALESCE(SUM(engagement_count), 0) as total_engagement
      FROM social_media_posts
    `);

    res.json({ success: true, posts: rows, stats: stats || {} });
  } catch (err) {
    console.error("Social media posts fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch communications posts" });
  }
});

// POST /api/comms/posts - Create planned post
router.post("/posts", authRequired, async (req, res) => {
  try {
    const {
      title,
      content_caption,
      platforms,
      target_date,
      status = "draft",
      coordinator = "Brids, not Breeze, Elvis",
      department_source = "Organization-wide",
      live_post_url = null,
      reach_count = 0,
      engagement_count = 0
    } = req.body;

    if (!title || !content_caption || !platforms || !target_date) {
      return res.status(400).json({
        success: false,
        error: "Title, content caption, target platforms, and target date are required."
      });
    }

    const [result] = await db.query(
      `INSERT INTO social_media_posts 
        (title, content_caption, platforms, target_date, status, coordinator, department_source, live_post_url, reach_count, engagement_count, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        content_caption,
        platforms,
        target_date,
        status,
        coordinator,
        department_source,
        live_post_url || null,
        Number(reach_count) || 0,
        Number(engagement_count) || 0,
        req.user.id
      ]
    );

    const [newPost] = await db.query("SELECT * FROM social_media_posts WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, post: newPost[0] });
  } catch (err) {
    console.error("Create social media post error:", err);
    res.status(500).json({ success: false, error: "Failed to create social post" });
  }
});

// PUT /api/comms/posts/:id - Update post details, status, or live URL
router.put("/posts/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content_caption,
      platforms,
      target_date,
      status,
      coordinator,
      department_source,
      live_post_url,
      reach_count,
      engagement_count
    } = req.body;

    const [existing] = await db.query("SELECT * FROM social_media_posts WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }
    const current = existing[0];

    await db.query(
      `UPDATE social_media_posts SET
        title = ?,
        content_caption = ?,
        platforms = ?,
        target_date = ?,
        status = ?,
        coordinator = ?,
        department_source = ?,
        live_post_url = ?,
        reach_count = ?,
        engagement_count = ?
       WHERE id = ?`,
      [
        title !== undefined ? title : current.title,
        content_caption !== undefined ? content_caption : current.content_caption,
        platforms !== undefined ? platforms : current.platforms,
        target_date !== undefined ? target_date : current.target_date,
        status !== undefined ? status : current.status,
        coordinator !== undefined ? coordinator : current.coordinator,
        department_source !== undefined ? department_source : current.department_source,
        live_post_url !== undefined ? live_post_url : current.live_post_url,
        reach_count !== undefined ? Number(reach_count) : current.reach_count,
        engagement_count !== undefined ? Number(engagement_count) : current.engagement_count,
        id
      ]
    );

    const [updated] = await db.query("SELECT * FROM social_media_posts WHERE id = ?", [id]);
    res.json({ success: true, post: updated[0] });
  } catch (err) {
    console.error("Update social media post error:", err);
    res.status(500).json({ success: false, error: "Failed to update social post" });
  }
});

// DELETE /api/comms/posts/:id - Remove post
router.delete("/posts/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM social_media_posts WHERE id = ?", [id]);
    res.json({ success: true, message: "Post removed successfully" });
  } catch (err) {
    console.error("Delete social post error:", err);
    res.status(500).json({ success: false, error: "Failed to delete post" });
  }
});

module.exports = router;
