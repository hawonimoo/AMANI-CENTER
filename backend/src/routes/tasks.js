const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly, canAccessProgram } = require("../middleware");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/tasks - List tasks with RBAC and filters
router.get("/", authRequired, async (req, res) => {
  try {
    const { program_id, assigned_to, status, priority, overdue, search, scope } = req.query;
    const isStaff = req.user.role === "staff";

    let query = `
      SELECT 
        t.id, 
        t.program_id, 
        t.assigned_to, 
        t.assigned_by, 
        t.title, 
        t.description, 
        t.priority,
        t.due_date, 
        t.status, 
        t.completion_notes,
        t.completed_at,
        t.created_at,
        p.name AS program_name,
        p.hub_id,
        h.name AS hub_name,
        u_assignee.name AS assigned_to_name,
        u_assignee.email AS assigned_to_email,
        u_assigner.name AS assigned_by_name,
        CASE 
          WHEN t.status != 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURDATE() THEN 1 
          ELSE 0 
        END AS is_overdue
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      LEFT JOIN hubs h ON p.hub_id = h.id
      JOIN users u_assignee ON t.assigned_to = u_assignee.id
      JOIN users u_assigner ON t.assigned_by = u_assigner.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC Scoping
    if (scope === "my" || (isStaff && !assigned_to && !program_id)) {
      query += ` AND t.assigned_to = ?`;
      params.push(req.user.id);
    } else if (req.user.role === "hub_leader") {
      query += ` AND p.hub_id = ?`;
      params.push(req.user.hub_id);
    } else if (req.user.role === "program_leader" && !program_id) {
      query += ` AND (p.leader_id = ? OR p.id IN (SELECT program_id FROM program_members WHERE user_id = ?))`;
      params.push(req.user.id, req.user.id);
    }

    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }

    if (program_id) {
      query += ` AND t.program_id = ?`;
      params.push(program_id);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }

    if (overdue === "true" || overdue === "1") {
      query += ` AND t.status != 'completed' AND t.due_date < CURDATE()`;
    }

    if (search) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ? OR u_assignee.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY 
      FIELD(t.status, 'pending', 'in_progress', 'completed'), 
      FIELD(t.priority, 'urgent', 'high', 'medium', 'low'), 
      t.due_date ASC, 
      t.id DESC`;

    const [tasks] = await db.query(query, params);

    // Calculate metrics
    const counts = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter((t) => t.is_overdue === 1).length,
      urgent: tasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length,
    };

    res.json({ success: true, counts, tasks });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tasks." });
  }
});

// GET /api/tasks/:id - Single task with activity history
router.get("/:id", authRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT 
        t.*, 
        p.name AS program_name,
        p.hub_id,
        u_assignee.name AS assigned_to_name,
        u_assignee.email AS assigned_to_email,
        u_assigner.name AS assigned_by_name
       FROM tasks t
       JOIN programs p ON t.program_id = p.id
       JOIN users u_assignee ON t.assigned_to = u_assignee.id
       JOIN users u_assigner ON t.assigned_by = u_assigner.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    const task = rows[0];

    // Fetch activities / notes
    const [activities] = await db.query(
      `SELECT ta.*, u.name AS user_name, u.role AS user_role
       FROM task_activities ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?
       ORDER BY ta.created_at ASC`,
      [taskId]
    );

    task.activities = activities;

    res.json({ success: true, task });
  } catch (error) {
    console.error("Fetch single task error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch task." });
  }
});

// POST /api/tasks - Create task (Leaders/Admin)
router.post("/", authRequired, leaderOnly, async (req, res) => {
  try {
    const { program_id, assigned_to, title, description, priority = "medium", due_date, status = "pending" } = req.body;

    if (!program_id || !assigned_to || !title) {
      return res.status(400).json({
        success: false,
        error: "Program, assignee, and task title are required.",
      });
    }

    const hasAccess = await canAccessProgram(req.user, program_id);
    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Cannot assign tasks outside your authorized programs." });
    }

    const [result] = await db.query(
      `INSERT INTO tasks (program_id, assigned_to, assigned_by, title, description, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        program_id,
        assigned_to,
        req.user.id,
        title.trim(),
        description || null,
        priority,
        due_date || null,
        status,
      ]
    );

    const taskId = result.insertId;

    // Record activity
    await db.query(
      "INSERT INTO task_activities (task_id, user_id, action, comment) VALUES (?, ?, 'created', ?)",
      [taskId, req.user.id, `Task created by ${req.user.name} with priority ${priority}`]
    );

    // Notify assignee
    await createNotification({
      userId: assigned_to,
      title: "New Task Assigned",
      message: `${req.user.name} assigned you: "${title.trim()}". Priority: ${priority.toUpperCase()}.`,
      type: "task_assigned",
      link: "#tasks",
    });

    await logAudit(req, "CREATE_TASK", "task", taskId, { title, assigned_to, priority });

    res.status(201).json({
      success: true,
      message: "Task delegated and assigned successfully.",
      taskId,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, error: "Failed to create task." });
  }
});

// PUT /api/tasks/:id - Update task details
router.put("/:id", authRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const [existing] = await db.query("SELECT * FROM tasks WHERE id = ?", [taskId]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    const task = existing[0];
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);
    const isAssignee = task.assigned_to === req.user.id;

    if (!isLeader && !isAssignee) {
      return res.status(403).json({ success: false, error: "Not authorized to update this task." });
    }

    const { program_id, assigned_to, title, description, priority, due_date, status, completion_notes } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      updates.push("status = ?");
      params.push(status);
      if (status === "completed") {
        updates.push("completed_at = CURRENT_TIMESTAMP");
      }
    }
    if (completion_notes !== undefined) {
      updates.push("completion_notes = ?");
      params.push(completion_notes);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description);
    }

    if (isLeader) {
      if (title) {
        updates.push("title = ?");
        params.push(title.trim());
      }
      if (priority) {
        updates.push("priority = ?");
        params.push(priority);
      }
      if (program_id) {
        updates.push("program_id = ?");
        params.push(program_id);
      }
      if (assigned_to) {
        updates.push("assigned_to = ?");
        params.push(assigned_to);
      }
      if (due_date !== undefined) {
        updates.push("due_date = ?");
        params.push(due_date || null);
      }
    }

    if (updates.length > 0) {
      params.push(taskId);
      await db.query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    // Add activity record
    await db.query(
      "INSERT INTO task_activities (task_id, user_id, action, comment) VALUES (?, ?, 'updated', ?)",
      [taskId, req.user.id, `Task updated by ${req.user.name}`]
    );

    res.json({ success: true, message: "Task updated successfully." });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, error: "Failed to update task." });
  }
});

// PATCH /api/tasks/:id/status - Update status & completion notes
router.patch("/:id/status", authRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status, completion_notes } = req.body;

    if (!["pending", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    const [existing] = await db.query(
      "SELECT title, assigned_to, assigned_by FROM tasks WHERE id = ?",
      [taskId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    const task = existing[0];
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);
    const isAssignee = task.assigned_to === req.user.id;

    if (!isLeader && !isAssignee) {
      return res.status(403).json({ success: false, error: "Not authorized to modify this task." });
    }

    const completedAtSql = status === "completed" ? "completed_at = CURRENT_TIMESTAMP," : "";
    await db.query(
      `UPDATE tasks 
       SET status = ?, ${completedAtSql} completion_notes = COALESCE(?, completion_notes) 
       WHERE id = ?`,
      [status, completion_notes || null, taskId]
    );

    // Record activity
    await db.query(
      "INSERT INTO task_activities (task_id, user_id, action, comment) VALUES (?, ?, 'status_changed', ?)",
      [taskId, req.user.id, `Status transitioned to "${status}" by ${req.user.name}`]
    );

    // If staff completed task, notify assigner
    if (status === "completed" && isAssignee && task.assigned_by !== req.user.id) {
      await createNotification({
        userId: task.assigned_by,
        title: "Task Completed",
        message: `${req.user.name} marked "${task.title}" as completed.`,
        type: "task_status",
        link: "#tasks",
      });
    }

    res.json({ success: true, message: `Task status changed to ${status}.` });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({ success: false, error: "Failed to update task status." });
  }
});

// POST /api/tasks/:id/comments - Add note/comment to task
router.post("/:id/comments", authRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: "Comment text is required." });
    }

    await db.query(
      "INSERT INTO task_activities (task_id, user_id, action, comment) VALUES (?, ?, 'commented', ?)",
      [taskId, req.user.id, comment.trim()]
    );

    res.status(201).json({ success: true, message: "Activity note added." });
  } catch (error) {
    console.error("Add task comment error:", error);
    res.status(500).json({ success: false, error: "Failed to add comment." });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    await db.query("DELETE FROM tasks WHERE id = ?", [taskId]);
    await logAudit(req, "DELETE_TASK", "task", taskId, `Deleted task ${taskId}`);
    res.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, error: "Failed to delete task." });
  }
});

module.exports = router;
