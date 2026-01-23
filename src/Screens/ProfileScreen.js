import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logout as authLogout } from "../services/auth";
import {
  getRecentSelectionsForUser,
  getTownById,
  getUserById,
  upgradeSubscription,
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
  const [upgrading, setUpgrading] = useState(false);
  const loggedIn = !!currentUser;

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, token, location.key]);

  // Refetch data when the page becomes visible (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) {
        fetchData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading]);

  const handleUpgrade = async (newStatus) => {
    setUpgrading(true);
    setError(null);
    try {
      await upgradeSubscription(currentUser.id, token, newStatus);
      await fetchData();
    } catch (e) {
      setError(e.message || "Upgrade failed");
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return <div className="profile-loading">Loading profile...</div>;
  if (error) return <div className="profile-error">{error}</div>;
  if (!profile) return <div className="profile-error">No profile data.</div>;

  const name = formatName(profile);
  const type = travelerType(profile);
  const sub = profile.subscription_status || "No subscription yet";
  const totalTrips = profile.total_trips;
  const lastTravel = history[0];
  const avatar = name?.[0]?.toUpperCase?.() || "J";

  return (
    <div className="jeeproute-page dashboard-shell profile-clean">
      <div className="jeeproute-navbar">
        <div className="navbar-shell">
          <div className="navbar-brand-block">
            <div className="navbar-badge" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-truck-front" viewBox="0 0 16 16"> <path d="M5 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0m8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-6-1a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2zM4 2a1 1 0 0 0-1 1v3.9c0 .625.562 1.092 1.17.994C5.075 7.747 6.792 7.5 8 7.5s2.925.247 3.83.394A1.008 1.008 0 0 0 13 6.9V3a1 1 0 0 0-1-1zm0 1h8v3.9q0 .002 0 0l-.002.004-.005.002h-.004C11.088 6.761 9.299 6.5 8 6.5s-3.088.26-3.99.406h-.003l-.005-.002L4 6.9q0 .002 0 0z"/> <path d="M1 2.5A2.5 2.5 0 0 1 3.5 0h9A2.5 2.5 0 0 1 15 2.5v9c0 .818-.393 1.544-1 2v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V14H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a2.5 2.5 0 0 1-1-2zM3.5 1A1.5 1.5 0 0 0 2 2.5v9A1.5 1.5 0 0 0 3.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 1z"/></svg></div>
            <div className="navbar-brand-copy">
              <span className="navbar-brand-title">JeepRoute</span>
              <span className="navbar-brand-tagline">Pampanga commute lab</span>
            </div>
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
                  Sign Up
                </button>
              </>
            )}
            {loggedIn && (
              <>
                <span className="navbar-greeting">
                  Hi, {(currentUser?.email || "User").split("@")[0]}
                </span>
                <button
                  className="btn-neon-fill"
                  onClick={() => navigate("/")}
                >
                  Planner
                </button>
                <button
                  className="btn-neon-outline"
                  onClick={() => {
                    try { authLogout(); } catch {}
                    try { localStorage.removeItem("currentUser"); } catch {}
                    navigate("/");
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-shell">
        <section className="profile-hero">
          <div className="profile-identity">
            <div className="profile-avatar">{avatar}</div>
            <div className="profile-heading">
              <p className="eyebrow">Profile</p>
              <h1 className="profile-title">{name}</h1>
              <p className="profile-subtitle">
                {type} • {sub}
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
                  Go to Planner
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => navigate("/payment")}
                >
                  Manage Subscription
                </button>
                <button
                  className="btn-success"
                  disabled={upgrading}
                  onClick={() => handleUpgrade("plus")}
                >
                  Upgrade to Plus
                </button>
                <button
                  className="btn-warning"
                  disabled={upgrading}
                  onClick={() => handleUpgrade("premium")}
                >
                  Upgrade to Premium
                </button>
                <button
                  className="btn-secondary"
                  disabled={upgrading}
                  onClick={() => handleUpgrade("free")}
                >
                  Set to Free
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
              <p className="metric-label">Subscription</p>
              <p className="metric-value">{sub}</p>
              <p className="metric-foot">{type}</p>
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
              <span className="pill">Active</span>
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
