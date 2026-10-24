import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function SocialMediaComms({ user }) {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formPlatforms, setFormPlatforms] = useState("Facebook, X, Instagram");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formCoordinator, setFormCoordinator] = useState("Brids, not Breeze, Elvis");
  const [formDepartment, setFormDepartment] = useState("Organization-wide");
  const [formLiveUrl, setFormLiveUrl] = useState("");
  const [formReach, setFormReach] = useState(0);
  const [formEngagement, setFormEngagement] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.comms.getPosts();
      setPosts(res.posts || []);
      setStats(res.stats || {});
    } catch (err) {
      setError(err.message || "Failed to load communications posts.");
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingPost(null);
    setFormTitle("");
    setFormCaption("");
    setFormPlatforms("Facebook, X, Instagram");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("draft");
    setFormCoordinator("Brids, not Breeze, Elvis");
    setFormDepartment("Organization-wide");
    setFormLiveUrl("");
    setFormReach(0);
    setFormEngagement(0);
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingPost(p);
    setFormTitle(p.title);
    setFormCaption(p.content_caption);
    setFormPlatforms(p.platforms);
    setFormDate(p.target_date);
    setFormStatus(p.status);
    setFormCoordinator(p.coordinator || "Brids, not Breeze, Elvis");
    setFormDepartment(p.department_source || "Organization-wide");
    setFormLiveUrl(p.live_post_url || "");
    setFormReach(p.reach_count || 0);
    setFormEngagement(p.engagement_count || 0);
    setShowModal(true);
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        title: formTitle,
        content_caption: formCaption,
        platforms: formPlatforms,
        target_date: formDate,
        status: formStatus,
        coordinator: formCoordinator,
        department_source: formDepartment,
        live_post_url: formLiveUrl,
        reach_count: formReach,
        engagement_count: formEngagement,
      };

      if (editingPost) {
        await api.comms.updatePost(editingPost.id, payload);
        setSuccess("Social media post updated.");
      } else {
        await api.comms.createPost(payload);
        setSuccess("New planned post added to calendar.");
      }
      setShowModal(false);
      fetchPosts();
    } catch (err) {
      setError(err.message || "Failed to save post.");
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("Remove this post from the calendar?")) return;
    try {
      await api.comms.deletePost(id);
      setSuccess("Post removed.");
      fetchPosts();
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📢</span>
            <h1 className="page-title">Social Media & Communications</h1>
          </div>
          <p className="page-subtitle">
            Organization-wide Content Strategy, Multi-Platform Publishing, Verification & Engagement
          </p>
        </div>

        <button className="btn-primary" onClick={openNewModal}>
          + Plan Social Post
        </button>
      </div>

      {/* Leadership / Coordination notice */}
      <div
        className="card"
        style={{
          borderLeft: "4px solid #dc2626",
          marginBottom: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a" }}>
            Communications Coordinator: <span style={{ color: "#dc2626" }}>Brids, not Breeze, Elvis</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
            Note: Name preserved verbatim as provided. This module covers organization-wide communications across Radio, Digital Hub, and Climate programs.
          </div>
        </div>
        <span className="badge badge-completed">Cross-Unit Scope</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Total Reach
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#dc2626", margin: "0.25rem 0" }}>
            {Number(stats.total_reach || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Audience impressions</div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Total Engagements
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {Number(stats.total_engagement || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Likes, shares, and comments</div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Published Posts
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {stats.published_posts || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Live across platforms</div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Scheduled / Drafts
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {(stats.scheduled_posts || 0) + (stats.draft_posts || 0)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>In editorial queue</div>
        </div>
      </div>

      {/* Content Calendar Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Post Title & Caption</th>
              <th>Source Unit</th>
              <th>Target Platforms</th>
              <th>Target Date</th>
              <th>Performance (Reach / Eng.)</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "#a1a1aa", padding: "2.5rem" }}>
                  No posts planned yet. Click "+ Plan Social Post" to schedule content.
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ maxWidth: "320px" }}>
                    <div style={{ fontWeight: 700, color: "#0a0a0a" }}>{p.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "3px", lineHeight: 1.3 }}>
                      {p.content_caption?.slice(0, 110)}
                      {p.content_caption?.length > 110 ? "..." : ""}
                    </div>
                    {p.live_post_url && (
                      <a
                        href={p.live_post_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "0.6875rem",
                          color: "#dc2626",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          marginTop: "4px",
                        }}
                      >
                        🔗 View Live Post
                      </a>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        background: "#f4f4f5",
                        color: "#18181b",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #e4e4e7",
                        fontWeight: 600,
                      }}
                    >
                      {p.department_source}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#27272a" }}>
                      {p.platforms}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                      {p.target_date}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                      <strong>{Number(p.reach_count || 0).toLocaleString()}</strong> reach
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#71717a", fontFamily: "var(--font-mono)" }}>
                      {p.engagement_count || 0} eng.
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${
                        p.status === "published"
                          ? "completed"
                          : p.status === "scheduled"
                          ? "in_progress"
                          : "pending"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        onClick={() => openEditModal(p)}
                      >
                        Update
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        onClick={() => handleDeletePost(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add/Edit Post */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPost ? "Update Social Media Post" : "Plan New Social Media Post"}
              </h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSavePost}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Post Headline / Working Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Broadcast Highlights: Community Health Discussion"
                  />
                </div>

                <div className="form-group">
                  <label>Content Caption & Hashtags *</label>
                  <textarea
                    rows="3"
                    required
                    value={formCaption}
                    onChange={(e) => setFormCaption(e.target.value)}
                    placeholder="Enter the post body, call-to-action, links, and #AmaniCenter tags..."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Target Platforms *</label>
                    <input
                      type="text"
                      required
                      value={formPlatforms}
                      onChange={(e) => setFormPlatforms(e.target.value)}
                      placeholder="e.g. Facebook, X, Instagram, TikTok, LinkedIn"
                    />
                  </div>

                  <div className="form-group">
                    <label>Source Department / Unit</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                    >
                      <option value="Organization-wide">Organization-wide</option>
                      <option value="Radio Station">Radio Station</option>
                      <option value="KijijiConnect Digital Hub">KijijiConnect Digital Hub</option>
                      <option value="Climate Change Program">Climate Change Program</option>
                      <option value="Finance & Operations">Finance & Operations</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Target Publishing Date *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Publication Status</label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Live Published Post URL (Verification)</label>
                  <input
                    type="url"
                    value={formLiveUrl}
                    onChange={(e) => setFormLiveUrl(e.target.value)}
                    placeholder="https://facebook.com/amanicenter/posts/..."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label>Reach Count</label>
                    <input
                      type="number"
                      value={formReach}
                      onChange={(e) => setFormReach(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Engagement</label>
                    <input
                      type="number"
                      value={formEngagement}
                      onChange={(e) => setFormEngagement(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Coordinator</label>
                    <input
                      type="text"
                      value={formCoordinator}
                      onChange={(e) => setFormCoordinator(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
