import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function FieldCollaboration({ user }) {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Post creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("field_work");
  const [formProgramId, setFormProgramId] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formContent, setFormContent] = useState("");

  // Active expanded comments
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [postDetails, setPostDetails] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, search]);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (activeCategory) params.category = activeCategory;
      if (search) params.search = search;

      const res = await api.collaboration.getPosts(params);
      setPosts(res.posts || []);
      setStats(res.stats || {});
    } catch (err) {
      setError(err.message || "Failed to load field collaboration board.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.collaboration.createPost({
        title: formTitle,
        category: formCategory,
        program_id: formProgramId ? Number(formProgramId) : null,
        location: formLocation,
        content: formContent,
      });
      setSuccess("Your update has been published to the organization collaboration board.");
      setShowCreateModal(false);
      setFormTitle("");
      setFormContent("");
      setFormLocation("");
      fetchPosts();
    } catch (err) {
      setError(err.message || "Failed to publish post.");
    }
  };

  const toggleExpandPost = async (id) => {
    if (expandedPostId === id) {
      setExpandedPostId(null);
      setPostDetails(null);
      return;
    }
    setExpandedPostId(id);
    try {
      const res = await api.collaboration.getPost(id);
      setPostDetails(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId) => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      await api.collaboration.addComment(postId, newComment.trim());
      setNewComment("");
      const res = await api.collaboration.getPost(postId);
      setPostDetails(res);
      // update local post comment count
      setPosts(posts.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)));
    } catch (err) {
      alert("Error adding comment: " + err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.collaboration.likePost(postId);
      setPosts(posts.map((p) => (p.id === postId ? { ...p, likes_count: res.likes_count } : p)));
      if (postDetails?.post?.id === postId) {
        setPostDetails({
          ...postDetails,
          post: { ...postDetails.post, likes_count: res.likes_count },
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (postId, newStatus) => {
    try {
      await api.collaboration.updateStatus(postId, newStatus);
      fetchPosts();
      if (postDetails?.post?.id === postId) {
        setPostDetails({
          ...postDetails,
          post: { ...postDetails.post, status: newStatus },
        });
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "field_work":
        return <span className="badge badge-in_progress">🚀 Field Work</span>;
      case "idea":
        return <span className="badge badge-admin">💡 New Idea</span>;
      case "challenge":
        return <span className="badge badge-needs_changes">⚠️ Operational Challenge</span>;
      case "success_story":
        return <span className="badge badge-completed">🏆 Success Story</span>;
      default:
        return <span className="badge badge-staff">{cat}</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.35rem" }}>🤝</span>
            <h1 className="page-title">Amani Field Collaboration & Ideas Hub</h1>
          </div>
          <p className="page-subtitle">
            Organization-wide Space: Field Updates • Innovation Ideas • Operational Challenges & Collective Problem-Solving
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Share Field Update / Idea / Challenge
        </button>
      </div>

      {/* Purpose Banner */}
      <div
        className="card"
        style={{
          borderLeft: "4px solid #dc2626",
          marginBottom: "1.75rem",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a" }}>
              All-Hands Organization Collaboration
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
              Every team member can log in here to broadcast what is happening on the ground, propose new ideas, celebrate milestones, and openly discuss operational challenges to solve them together.
            </div>
          </div>
          <span className="badge badge-completed">Open to All Personnel</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stats Counter Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          className="card"
          onClick={() => setActiveCategory("")}
          style={{
            cursor: "pointer",
            borderLeft: activeCategory === "" ? "3px solid #dc2626" : "1px solid #e4e4e7",
            backgroundColor: activeCategory === "" ? "#fef2f2" : "#ffffff",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            All Discussions
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0a0a0a", margin: "0.2rem 0" }}>
            {stats.total_posts || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Total community updates</div>
        </div>

        <div
          className="card"
          onClick={() => setActiveCategory("field_work")}
          style={{
            cursor: "pointer",
            borderLeft: activeCategory === "field_work" ? "3px solid #dc2626" : "1px solid #e4e4e7",
            backgroundColor: activeCategory === "field_work" ? "#fef2f2" : "#ffffff",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            🚀 Field Work Updates
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#dc2626", margin: "0.2rem 0" }}>
            {stats.field_work_count || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Field activities & inspections</div>
        </div>

        <div
          className="card"
          onClick={() => setActiveCategory("idea")}
          style={{
            cursor: "pointer",
            borderLeft: activeCategory === "idea" ? "3px solid #dc2626" : "1px solid #e4e4e7",
            backgroundColor: activeCategory === "idea" ? "#fef2f2" : "#ffffff",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            💡 Ideas & Proposals
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0a0a0a", margin: "0.2rem 0" }}>
            {stats.idea_count || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>New initiatives pitched</div>
        </div>

        <div
          className="card"
          onClick={() => setActiveCategory("challenge")}
          style={{
            cursor: "pointer",
            borderLeft: activeCategory === "challenge" ? "3px solid #dc2626" : "1px solid #e4e4e7",
            backgroundColor: activeCategory === "challenge" ? "#fef2f2" : "#ffffff",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            ⚠️ Open Challenges
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#dc2626", margin: "0.2rem 0" }}>
            {stats.challenge_count || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Field issues to solve</div>
        </div>

        <div
          className="card"
          onClick={() => setActiveCategory("success_story")}
          style={{
            cursor: "pointer",
            borderLeft: activeCategory === "success_story" ? "3px solid #dc2626" : "1px solid #e4e4e7",
            backgroundColor: activeCategory === "success_story" ? "#fef2f2" : "#ffffff",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            🏆 Success Stories
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0a0a0a", margin: "0.2rem 0" }}>
            {stats.success_count || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Milestones achieved</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: "0.85rem 1.25rem", marginBottom: "1.75rem", display: "flex", gap: "1rem" }}>
        <input
          type="text"
          placeholder="Search updates by keyword, location, or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {activeCategory && (
          <button
            onClick={() => setActiveCategory("")}
            className="btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", whiteSpace: "nowrap" }}
          >
            Clear Filter ✕
          </button>
        )}
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#71717a" }}>
          Loading collaboration posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "#71717a" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💬</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0a0a0a" }}>
            No Updates Posted in this Category Yet
          </h3>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Be the first to share a field update, propose an idea, or raise a discussion topic!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {posts.map((post) => {
            const isExpanded = expandedPostId === post.id;
            return (
              <div
                key={post.id}
                className="card"
                style={{
                  borderLeft: post.category === "challenge" ? "4px solid #dc2626" : "1px solid #e4e4e7",
                }}
              >
                {/* Post Top Metadata */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {getCategoryBadge(post.category)}
                    {post.program_name && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          background: "#f4f4f5",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          color: "#18181b",
                        }}
                      >
                        {post.program_name}
                      </span>
                    )}
                    {post.location && (
                      <span style={{ fontSize: "0.75rem", color: "#71717a" }}>
                        📍 {post.location}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`badge badge-${post.status === "implemented" || post.status === "resolved" ? "completed" : "pending"}`}>
                      {post.status.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>
                      {post.created_at?.slice(0, 16)}
                    </span>
                  </div>
                </div>

                {/* Post Title & Content */}
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a", margin: "0.6rem 0 0.35rem" }}>
                  {post.title}
                </h3>

                <p style={{ fontSize: "0.875rem", color: "#27272a", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                  {post.content}
                </p>

                {/* Author Info & Actions Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1.25rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #f4f4f5",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: "#0a0a0a",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        border: "1px solid #dc2626",
                      }}
                    >
                      {post.author_name ? post.author_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0a0a0a" }}>
                        {post.author_name}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "#71717a" }}>
                        {post.author_job_title || "Staff"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {/* Status updater for Author or Leaders */}
                    {["admin", "hub_leader", "program_leader"].includes(user?.role) && (
                      <select
                        value={post.status}
                        onChange={(e) => handleStatusChange(post.id, e.target.value)}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.5rem",
                          width: "auto",
                          borderRadius: "4px",
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in_discussion">In Discussion</option>
                        <option value="implemented">Implemented</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    )}

                    <button
                      onClick={() => handleLike(post.id)}
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    >
                      ❤️ Cheer ({post.likes_count || 0})
                    </button>

                    <button
                      onClick={() => toggleExpandPost(post.id)}
                      className="btn-secondary"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.75rem",
                        backgroundColor: isExpanded ? "#f4f4f5" : "#ffffff",
                      }}
                    >
                      💬 Discuss ({post.comments_count || 0})
                    </button>
                  </div>
                </div>

                {/* Expanded Discussion Comments Section */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid #e4e4e7",
                      backgroundColor: "#fafafa",
                      padding: "1rem",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "0.875rem", color: "#0a0a0a", marginBottom: "0.75rem" }}>
                      Team Discussion & Feedback
                    </div>

                    {postDetails?.comments?.length === 0 ? (
                      <div style={{ fontSize: "0.8125rem", color: "#71717a", fontStyle: "italic", marginBottom: "1rem" }}>
                        No comments yet. Share your thoughts or solution to this field update below.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                        {postDetails?.comments?.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              background: "#ffffff",
                              padding: "0.75rem 1rem",
                              borderRadius: "6px",
                              border: "1px solid #e4e4e7",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0a0a0a" }}>
                                  {c.author_name}
                                </span>
                                <span style={{ fontSize: "0.6875rem", color: "#71717a" }}>
                                  ({c.author_job_title})
                                </span>
                              </div>
                              <span style={{ fontSize: "0.6875rem", color: "#a1a1aa" }}>
                                {c.created_at?.slice(0, 16)}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.8125rem", color: "#27272a", lineHeight: 1.4 }}>
                              {c.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="Write a response, idea, or solution..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                      />
                      <button
                        className="btn-primary"
                        disabled={commentLoading || !newComment.trim()}
                        onClick={() => handleAddComment(post.id)}
                        style={{ whiteSpace: "nowrap", padding: "0.5rem 1rem" }}
                      >
                        {commentLoading ? "Posting..." : "Reply"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Share Field Update / Idea / Challenge */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Share with the Amani Center Organization</h3>
              <button onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreatePost}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title / Headline *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Tree Seedling Logistics Update or Studio Solar Inverter Proposal"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Category *</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                      <option value="field_work">🚀 Field Work Update</option>
                      <option value="idea">💡 New Idea & Proposal</option>
                      <option value="challenge">⚠️ Operational Challenge to Discuss</option>
                      <option value="success_story">🏆 Success Story & Milestone</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Related Program / Department</label>
                    <select value={formProgramId} onChange={(e) => setFormProgramId(e.target.value)}>
                      <option value="">-- Organization-wide --</option>
                      <option value="1">Vox Radio Station</option>
                      <option value="2">KijijiConnect Digital Hub</option>
                      <option value="3">Climate Change Program</option>
                      <option value="4">Online & Social Media Communications</option>
                      <option value="5">Finance Department</option>
                      <option value="6">Executive Management & Leadership</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Field Location (Optional)</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Kili Foothills Community Lands or Studio Desk"
                  />
                </div>

                <div className="form-group">
                  <label>Full Content & Discussion Details *</label>
                  <textarea
                    rows="4"
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Describe the field work progress, pitch your idea, or clearly outline the challenge you want the team to discuss..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Publish to Organization Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
