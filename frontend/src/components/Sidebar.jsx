import React from "react";

export default function Sidebar({ activePage, setActivePage, user, isOpen, setIsOpen }) {
  // Only John Green and Khavai Aghribina (and Super Admin) can view everything
  const isExecutive =
    user?.role === "admin" ||
    user?.email === "john.green@amanicenter.org" ||
    user?.email === "khavai@amanicenter.org";

  const userJobTitle = user?.job_title?.toLowerCase() || "";
  const userEmail = user?.email?.toLowerCase() || "";

  // Unit-specific manager / staff access checks
  const canAccessRadio =
    isExecutive ||
    userEmail.includes("maureen.buya") ||
    userJobTitle.includes("radio") ||
    userJobTitle.includes("vox") ||
    userEmail.includes("kula") ||
    userEmail.includes("zaikun") ||
    userEmail.includes("yoash") ||
    userEmail.includes("yusuf") ||
    userEmail.includes("nimoo");

  const canAccessHub =
    isExecutive ||
    userEmail.includes("bob.wandati") ||
    userJobTitle.includes("hub") ||
    userEmail.includes("nimoo");

  const canAccessClimate =
    isExecutive ||
    userEmail.includes("maua") ||
    userJobTitle.includes("climate") ||
    userEmail.includes("nimoo");

  const canAccessComms =
    isExecutive ||
    userEmail.includes("elvis") ||
    userJobTitle.includes("online") ||
    userJobTitle.includes("media") ||
    userEmail.includes("nimoo");

  const canAccessFinance =
    isExecutive ||
    userEmail.includes("salma") ||
    userJobTitle.includes("finance");

  // Navigation Items Structure
  const navSections = [
    {
      title: "CORE DASHBOARD",
      items: [
        {
          id: "dashboard",
          label: isExecutive ? "Executive Operations Center" : "My Personal Dashboard",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
          ),
        },
        // The All-Hands Organization-wide Field Work & Ideas Hub
        {
          id: "collaboration",
          label: "Field Work & Ideas Hub",
          badge: "All Hands",
          highlight: true,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          ),
        },
      ],
    },
    {
      title: isExecutive ? "ALL DEPARTMENTS & UNITS" : "MY ASSIGNED UNITS",
      items: [
        canAccessRadio && {
          id: "radio",
          label: "Vox Radio Station",
          badge: "Maureen Buya",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
              <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
              <circle cx="12" cy="12" r="2"></circle>
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
              <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"></path>
            </svg>
          ),
        },
        canAccessHub && {
          id: "hub",
          label: "KijijiConnect Digital Hub",
          badge: "Bob Wandati",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          ),
        },
        canAccessClimate && {
          id: "climate",
          label: "Climate Change Program",
          badge: "Maua",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20"></path>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          ),
        },
        canAccessComms && {
          id: "comms",
          label: "Online & Social Media",
          badge: "Elvis",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          ),
        },
        canAccessFinance && {
          id: "finance",
          label: "Finance Department",
          badge: "Salma",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          ),
        },
        isExecutive && {
          id: "programs",
          label: "All Programs Roster",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          ),
        },
      ].filter(Boolean),
    },
    {
      title: "OPERATIONS & ACCOUNTABILITY",
      items: [
        {
          id: "tasks",
          label: isExecutive ? "Task Delegation & Operations" : "My Assigned Tasks",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          ),
        },
        {
          id: "reports",
          label: isExecutive ? "All Staff Daily Reports" : "My Daily Work Report",
          badge: "Required",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          ),
        },
        {
          id: "attendance",
          label: "Attendance & Shift Punch",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          ),
        },
        {
          id: "announcements",
          label: "Announcements",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          ),
        },
      ],
    },
    // Administration & Executive Controls (Only John Green & Khavai)
    isExecutive && {
      title: "EXECUTIVE ADMINISTRATION",
      items: [
        {
          id: "staff",
          label: "Staff & Leader Directory",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
            </svg>
          ),
        },
        {
          id: "analytics",
          label: "Audit Trail & System Settings",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          ),
        },
      ],
    },
  ].filter(Boolean);

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="sidebar-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 90,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isOpen ? "sidebar-open" : ""}`}
      >
        {/* Brand Header */}
        <div
          style={{
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.25rem",
            borderBottom: "1px solid #262626",
            background: "#000000",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <img
              src="/logo.png"
              alt="Amani Center CBO"
              style={{ width: "34px", height: "34px", borderRadius: "6px", background: "#ffffff", padding: "2px", objectFit: "contain" }}
            />
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Amani Center CBO
              </h1>
              <p style={{ fontSize: "0.6875rem", color: "#a1a1aa", fontWeight: 500 }}>
                KijijiConnect Digital Hub
              </p>
            </div>
          </div>

          {/* Close button on mobile screens */}
          <button
            onClick={() => setIsOpen(false)}
            className="mobile-close-sidebar-btn"
            style={{
              display: "none",
              color: "#a1a1aa",
              background: "transparent",
              border: "none",
              padding: "4px",
              cursor: "pointer",
            }}
            title="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {navSections.map((sec, idx) => (
            <div key={idx}>
              <div
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  color: "#71717a",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0 0.5rem 0.5rem",
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                {sec.items.map((item) => {
                  const isActive = activePage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        if (setIsOpen) setIsOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "6px",
                        fontSize: "0.8125rem",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#ffffff" : "#a1a1aa",
                        backgroundColor: isActive ? "#1c1917" : "transparent",
                        borderLeft: isActive ? "3px solid #dc2626" : "3px solid transparent",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#18181b";
                          e.currentTarget.style.color = "#ffffff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#a1a1aa";
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                        <span style={{ color: isActive ? "#dc2626" : (item.highlight ? "#ef4444" : "#71717a"), display: "flex" }}>
                          {item.icon}
                        </span>
                        <span style={{ truncate: true }}>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          style={{
                            fontSize: "0.625rem",
                            fontWeight: 700,
                            background: item.badge === "Required" ? "#dc2626" : (isActive ? "#dc2626" : "#27272a"),
                            color: "#ffffff",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            marginLeft: "0.25rem",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card in Footer */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderTop: "1px solid #262626",
            background: "#000000",
            fontSize: "0.6875rem",
            color: "#71717a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "#ffffff", truncate: true }}>{user?.name}</div>
            <div style={{ fontSize: "0.625rem", color: isExecutive ? "#dc2626" : "#a1a1aa", fontWeight: isExecutive ? 700 : 500, truncate: true }}>
              {isExecutive ? "Executive Admin" : (user?.job_title ? user.job_title.slice(0, 24) : user?.role)}
            </div>
          </div>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#dc2626",
            }}
            title="Online"
          />
        </div>
      </aside>
    </>
  );
}
