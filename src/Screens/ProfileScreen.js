import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, [currentUser, token]);

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
    <div className="jeeproute-page profile-clean">
      <div className="jeeproute-navbar">
        <div className="brand">JeepRoute</div>
        <div className="header-actions">
          <button className="btn-neon-outline" onClick={() => navigate("/")}>
            Home
          </button>
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
