import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Spinner from "../Components/Spinner";
import { logout as authLogout } from "../services/auth";
import {
  getRecentSelectionsForUser,
  getTownById,
  getUserById,
} from "./db";


function formatName(user) {
  if (!user) return "Unknown";
  const base =
    user.username || (user.email ? user.email.split("@")[0] : "User");
  return base.replace(/[-_.]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function travelerType(user) {
  const u = (user?.username || "") + " " + (user?.email || "");
  return /student/i.test(u) ? "Student" : "Regular";
}


export default function ProfileScreen({ currentUser, token }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [navUserOpen, setNavUserOpen] = useState(false);
  const navUserRef = useRef(null);
  const loggedIn = !!currentUser;

  const fetchData = useCallback(async () => {
    // Redirect to sign-in if not authenticated
    if (!currentUser || !token) {
      navigate('/signin', { state: { redirectTo: '/profile' } });
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const userId = currentUser?.id;
      if (!userId) throw new Error("No user ID");
      const prof = await getUserById(userId, token);
      const hist = await getRecentSelectionsForUser(userId, token);
      setProfile(prof);
      setHistory(
        (hist || []).map((sel) => {
          const townName = sel.town_name || getTownById(sel.town_id)?.name || `Town ${sel.town_id}`;
          const date = new Date(sel.selected_at);
          return {
            town: townName,
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
          };
        })
      );
    } catch (e) {
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [currentUser, token, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData, location.key]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navUserRef.current && !navUserRef.current.contains(e.target)) {
        setNavUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refetch data when the page becomes visible (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) {
        fetchData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading, fetchData]);

  if (loading) {
    return (
      <div className="profile-loading-state">
        <Spinner size={52} color="#f07818" text="Loading profile..." />
      </div>
    );
  }
  if (error) return <div className="profile-error">{error}</div>;
  if (!profile) return <div className="profile-error">No profile data.</div>;

  const name = formatName(profile);
  const type = travelerType(profile);
  const sub = profile.subscription_status || "No subscription yet";
  const totalTrips = profile.total_trips;
  const lastTravel = history[0];
  const avatar = name?.[0]?.toUpperCase?.() || "J";
  const helloName = (currentUser?.username || currentUser?.email || "User").split("@")[0];
  const isPlus = String(sub).toLowerCase().includes("plus");

  return (
    <div className="jeeproute-page dashboard-shell home-landing-page profile-clean">
      <div className="jeeproute-navbar">
        <div className="navbar-shell home-navbar-shell">
          <div className="navbar-brand-block">
            <div className="navbar-badge" aria-hidden="true">↗</div>
            <div className="navbar-brand-copy">
              <span className="navbar-brand-title">
                Jeep<span className="home-brand-route">Route</span>
              </span>
            </div>
          </div>

          <div className="home-navbar-links" aria-label="Primary">
            <button className="home-nav-link" onClick={() => navigate("/")}>Home</button>
            <button className="home-nav-link" onClick={() => navigate("/")}>Routes</button>
            <button className="home-nav-link" onClick={() => navigate("/details")}>Plans</button>
          </div>

          <div className="header-actions navbar-actions">
            {!loggedIn && (
              <>
                <button
                  className="btn-neon-outline"
                  onClick={() => navigate("/signin")}
                >
                  Sign In
                </button>
                <button
                  className="btn-neon-fill"
                  onClick={() => navigate("/signup")}
                >
                  Get Started
                </button>
              </>
            )}
            {loggedIn && (
              <div className="nav-user-menu" ref={navUserRef}>
                <button
                  className="nav-user-trigger"
                  onClick={() => setNavUserOpen((o) => !o)}
                  aria-expanded={navUserOpen}
                  aria-haspopup="true"
                >
                  Hello, {helloName} <span className="nav-user-caret">{navUserOpen ? "▲" : "▼"}</span>
                </button>
                {navUserOpen && (
                  <div className="nav-user-dropdown">
                    <button
                      className="nav-user-option"
                      onClick={() => {
                        setNavUserOpen(false);
                        navigate("/profile");
                      }}
                    >
                      Profile
                    </button>
                    <button
                      className="nav-user-option nav-user-option-signout"
                      onClick={() => {
                        setNavUserOpen(false);
                        try {
                          authLogout();
                        } catch {}
                        try {
                          localStorage.removeItem("currentUser");
                        } catch {}
                        navigate("/");
                      }}
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-shell">
        <section className="profile-hero">
          <div className="profile-identity">
            <div className="profile-avatar">{avatar}</div>
            <div className="profile-heading">
              <p className="eyebrow">Traveler Profile</p>
              <h1 className="profile-title">{name}</h1>
              <p className="profile-subtitle">
                {type} commuter • {isPlus ? "Plus Member" : sub}
              </p>
              <div className="profile-tags">
                <span className="chip">{type}</span>
                <span className="chip">Trips: {totalTrips || "0"}</span>
                {lastTravel && (
                  <span className="chip">Last: {lastTravel.town}</span>
                )}
              </div>
              <div className="profile-actions">
                <button className="btn-primary" onClick={() => navigate("/")}>
                  Open Planner
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => navigate("/payment", { state: { plan: "plus" } })}
                >
                  {isPlus ? "Manage Plus" : "Upgrade to Plus"}
                </button>
              </div>
            </div>
          </div>

          <div className="profile-metrics">
            <div className="metric-card">
              <p className="metric-label">Total Trips</p>
              <p className="metric-value">{totalTrips || "—"}</p>
              <p className="metric-foot">
                {lastTravel ? `Latest: ${lastTravel.town}` : "No trips yet"}
              </p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Membership</p>
              <p className="metric-value">{isPlus ? "Plus" : "Free"}</p>
              <p className="metric-foot">{sub}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Last Travel</p>
              <p className="metric-value">
                {lastTravel ? lastTravel.town : "—"}
              </p>
              <p className="metric-foot">
                {lastTravel
                  ? `${lastTravel.date} • ${lastTravel.time}`
                  : "Awaiting your next route"}
              </p>
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <div className="profile-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Account</p>
                <h3>Traveler Details</h3>
              </div>
              <span className="pill">Verified</span>
            </div>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-label">Name</span>
                <span className="detail-value">{name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Traveler Type</span>
                <span className="detail-value">{type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Subscription</span>
                <span className="detail-value">{sub}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">
                  {profile?.email || "Not provided"}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Recent</p>
                <h3>Travel History</h3>
              </div>
              <span className="microcopy">
                Last {history.length || 0} trips
              </span>
            </div>
            {history.length === 0 ? (
              <div className="empty-state">
                <p>No recent travels yet.</p>
                <button className="btn-primary" onClick={() => navigate("/")}>
                  Plan a trip
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map((h, idx) => (
                  <div key={idx} className="history-item">
                    <div>
                      <p className="history-town">{h.town}</p>
                      <p className="history-meta">
                        {h.date} • {h.time}
                      </p>
                    </div>
                    <span className="pill pill-soft">Completed</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
