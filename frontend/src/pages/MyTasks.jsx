import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MyTasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, urgent: 0 });
  const [programs, setPrograms] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState("");
  const [viewScope, setViewScope] = useState("my"); // "my" or "all"

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [formData, setFormData] = useState({
    program_id: "",
    assigned_to: "",
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    status: "pending",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Activity / History Modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeTaskDetails, setActiveTaskDetails] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Status Change Note Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetTask, setStatusTargetTask] = useState(null);
  const [targetStatusValue, setTargetStatusValue] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    fetchInitialMeta();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedStatus, selectedPriority, selectedProgram, onlyOverdue, search, viewScope]);

  const fetchInitialMeta = async () => {
    try {
      const [progRes, usersRes] = await Promise.all([
        api.programs.getAll(),
        isLeader ? api.users.getAll() : Promise.resolve({ users: [] }),
      ]);
      setPrograms(progRes.programs || []);
      setStaffUsers(usersRes.users || []);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;
      if (selectedProgram) params.program_id = selectedProgram;
      if (onlyOverdue) params.overdue = "1";
      if (search) params.search = search;
      if (!isLeader || viewScope === "my") params.scope = "my";

      const res = await api.tasks.getAll(params);
      setTasks(res.tasks || []);
      setCounts(res.counts || { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, urgent: 0 });
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  };

  const promptStatusChange = (task, newStatus) => {
    if (newStatus === "completed") {
      setStatusTargetTask(task);
      setTargetStatusValue(newStatus);
      setCompletionNotes(task.completion_notes || "");
      setShowStatusModal(true);
    } else {
      applyStatusChange(task.id, newStatus, null);
    }
  };

  const applyStatusChange = async (taskId, newStatus, notes) => {
    try {
      await api.tasks.updateStatus(taskId, newStatus, notes);
      setShowStatusModal(false);
      fetchTasks();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  const openActivityModal = async (task) => {
    try {
      const res = await api.tasks.getOne(task.id);
      setActiveTaskDetails(res.task);
      setNewComment("");
      setShowActivityModal(true);
    } catch (err) {
      alert("Error loading task history: " + err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTaskDetails) return;
    setCommentSubmitting(true);
    try {
      await api.tasks.addComment(activeTaskDetails.id, newComment);
      const res = await api.tasks.getOne(activeTaskDetails.id);
      setActiveTaskDetails(res.task);
      setNewComment("");
    } catch (err) {
      alert("Failed to add comment: " + err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.tasks.delete(taskId);
      fetchTasks();
    } catch (err) {
      alert("Error deleting task: " + err.message);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTaskId(null);
    setFormData({
      program_id: programs[0]?.id || "",
      assigned_to: user?.id || "",
      title: "",
      description: "",
      priority: "medium",
      due_date: new Date().toISOString().slice(0, 10),
      status: "pending",
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setModalMode("edit");
    setEditingTaskId(task.id);
    setFormData({
      program_id: task.program_id,
      assigned_to: task.assigned_to,
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      status: task.status,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.title || !formData.program_id || !formData.assigned_to) {
        throw new Error("Title, program, and assignee are required.");
      }

      if (modalMode === "create") {
        await api.tasks.create(formData);
      } else {
        await api.tasks.update(editingTaskId, formData);
      }

      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.message || "Failed to save task.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadgeClass = (prio) => {
    switch (prio) {
      case "urgent":
        return "badge-needs_changes";
      case "high":
        return "badge-pending";
      case "medium":
        return "badge-submitted";
      default:
        return "badge-staff";
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{isLeader && viewScope === "all" ? "Organization Tasks & Operations" : "My Assigned Tasks"}</h1>
          <p className="page-subtitle">Track deliverables, manage milestones, monitor overdue work, and log completions</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => api.analytics.downloadExport("tasks")}>
            <span>📥 Export CSV</span>
          </button>

          {isLeader && (
            <div
              style={{
                display: "flex",
                background: "#ffffff",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "2px",
              }}
            >
              <button
                onClick={() => setViewScope("my")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  background: viewScope === "my" ? "var(--color-primary)" : "transparent",
                  color: viewScope === "my" ? "#fff" : "var(--color-text-muted)",
                }}
              >
                My Tasks
              </button>
              <button
                onClick={() => setViewScope("all")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  background: viewScope === "all" ? "var(--color-primary)" : "transparent",
                  color: viewScope === "all" ? "#fff" : "var(--color-text-muted)",
                }}
              >
                All Team Tasks
              </button>
            </div>
          )}

          {isLeader && (
            <button className="btn-primary" onClick={openCreateModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Assign New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <input
            type="text"
            placeholder="Search deliverables by title or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">All Statuses ({counts.total})</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="in_progress">In Progress ({counts.in_progress})</option>
            <option value="completed">Completed ({counts.completed})</option>
          </select>
        </div>

        <div style={{ flex: "0 1 150px" }}>
          <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span style={{ color: "#dc2626", fontWeight: 600 }}>Only Overdue ({counts.overdue || 0})</span>
        </label>

        {(search || selectedProgram || selectedStatus || selectedPriority || onlyOverdue) && (
          <button
            onClick={() => {
              setSearch("");
              setSelectedProgram("");
              setSelectedStatus("");
              setSelectedPriority("");
              setOnlyOverdue(false);
            }}
            style={{ fontSize: "0.8125rem", color: "var(--color-danger-text)", fontWeight: 600 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Loading deliverables...</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-main)" }}>No Deliverables Found</h3>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {search || selectedProgram || selectedStatus || selectedPriority || onlyOverdue
              ? "Try adjusting your filter selection above."
              : "No tasks are currently assigned in this section."}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "32%" }}>Deliverable & Details</th>
                <th>Program & Hub</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} style={{ backgroundColor: task.is_overdue ? "#fffbfb" : "transparent" }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text-main)",
                          fontSize: "0.9375rem",
                          textDecoration: task.status === "completed" ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </span>
                      {task.is_overdue === 1 && (
                        <span style={{ fontSize: "0.6875rem", background: "#fee2e2", color: "#991b1b", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          OVERDUE
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                        {task.description}
                      </div>
                    )}

                    {task.completion_notes && (
                      <div style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "0.25rem", fontStyle: "italic" }}>
                        ✓ Completion Note: "{task.completion_notes}"
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{task.program_name}</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>{task.hub_name}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>
                      {task.assigned_to_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>by {task.assigned_by_name}</div>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: task.is_overdue ? "#dc2626" : (task.due_date ? "#334155" : "#94a3b8"),
                      }}
                    >
                      {task.due_date ? task.due_date : "No deadline"}
                    </span>
                  </td>
                  <td>
                    <select
                      value={task.status}
                      onChange={(e) => promptStatusChange(task, e.target.value)}
                      style={{
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: "6px",
                        width: "auto",
                        background:
                          task.status === "completed"
                            ? "#18181b"
                            : task.status === "in_progress"
                            ? "#fef2f2"
                            : "#fffbeb",
                        color:
                          task.status === "completed"
                            ? "#ffffff"
                            : task.status === "in_progress"
                            ? "#dc2626"
                            : "#92400e",
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => openActivityModal(task)}
                        title="View Task Activity Timeline"
                        style={{
                          padding: "0.3rem 0.6rem",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        History
                      </button>
                      {isLeader && (
                        <button
                          onClick={() => openEditModal(task)}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--color-primary)",
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {isLeader && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#dc2626",
                            background: "#fef2f2",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Completion Notes Modal */}
      {showStatusModal && statusTargetTask && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Finalize Task: {statusTargetTask.title}</h3>
              <button onClick={() => setShowStatusModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                Add any final remarks, handover links, or metrics before marking this deliverable as completed.
              </p>
              <div className="form-group">
                <label>Completion Notes & Handover Details (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Mastered file uploaded to Google Drive; broadcast aired successfully."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => applyStatusChange(statusTargetTask.id, targetStatusValue, completionNotes)}
              >
                Mark as Completed ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Activity & Comments Modal */}
      {showActivityModal && activeTaskDetails && (
        <div className="modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Task History & Notes - {activeTaskDetails.title}</h3>
              <button onClick={() => setShowActivityModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Activity Timeline */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Timeline & Comments ({activeTaskDetails.activities?.length || 0})
                </span>

                {(!activeTaskDetails.activities || activeTaskDetails.activities.length === 0) ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                    No recorded activities for this task yet.
                  </div>
                ) : (
                  activeTaskDetails.activities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        padding: "0.75rem 0.9rem",
                        background: "#f8fafc",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>
                          {act.user_name} ({act.user_role})
                        </span>
                        <span style={{ color: "#94a3b8" }}>{act.created_at?.slice(0, 16)}</span>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#334155", marginTop: "0.25rem" }}>
                        {act.comment}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment}>
                <div className="form-group">
                  <label>Post Progress Note / Comment</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Write an operational update, roadblock, or feedback..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-secondary" disabled={commentSubmitting} style={{ fontSize: "0.8125rem" }}>
                  {commentSubmitting ? "Posting..." : "+ Post Note"}
                </button>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowActivityModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === "create" ? "Assign New Task Deliverable" : "Edit Deliverable"}</h3>
              <button onClick={() => setShowModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Conduct rural farmer water harvesting audit"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Program *</label>
                    <select
                      required
                      value={formData.program_id}
                      onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                    >
                      <option value="">Select Program</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assigned To *</label>
                    <select
                      required
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    >
                      <option value="">Select Staff Member</option>
                      {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Priority *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Deliverable Specifications & Criteria</label>
                  <textarea
                    rows={4}
                    placeholder="Provide context, required deliverables, standards, or criteria..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : modalMode === "create" ? "Delegate Task" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
