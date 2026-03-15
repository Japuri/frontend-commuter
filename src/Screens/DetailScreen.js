import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function DetailScreen({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const loggedIn = !!currentUser;
  const [navUserOpen, setNavUserOpen] = useState(false);
  const navUserRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navUserRef.current && !navUserRef.current.contains(e.target)) {
        setNavUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpgrade = () => {
    if (currentUser) {
      navigate("/payment");
    } else {
      navigate("/signin", { state: { redirectTo: "/payment" } });
    }
  };

  const handleSignOut = () => {
    if (setCurrentUser) setCurrentUser(null);
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  return (
    <div className="jeeproute-page home-landing-page details-page">
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
            <button className="home-nav-link is-active">Plans</button>
          </div>

          <div className="header-actions navbar-actions">
            {!loggedIn ? (
              <>
                <button className="btn-neon-outline" onClick={() => navigate("/signin")}>Sign In</button>
                <button className="btn-neon-fill" onClick={() => navigate("/signup")}>Get Started</button>
              </>
            ) : (
              <div className="nav-user-menu" ref={navUserRef}>
                <button
                  className="nav-user-trigger"
                  onClick={() => setNavUserOpen(o => !o)}
                  aria-expanded={navUserOpen}
                  aria-haspopup="true"
                >
                  Hello, {(currentUser.username || currentUser.email || "User").split("@")[0]} <span className="nav-user-caret">{navUserOpen ? "▲" : "▼"}</span>
                </button>
                {navUserOpen && (
                  <div className="nav-user-dropdown">
                    <button className="nav-user-option" onClick={() => { setNavUserOpen(false); navigate("/profile"); }}>
                      Profile
                    </button>
                    <button className="nav-user-option nav-user-option-signout" onClick={() => { setNavUserOpen(false); handleSignOut(); }}>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="details-container">
        <div className="details-hero">
          <div className="details-hero-copy">
            <div className="details-eyebrow">JeepRoute Plus</div>
            <h1 className="details-title">Commute smarter with live AI</h1>
            <p className="details-lead">
              Weather-aware ETAs, traffic trends, and smart departures—built for Pampanga students on the move.
            </p>
            <div className="details-badges">
              <span className="badge-text">Live weather + traffic</span>
              <span className="badge-text">AI optimal departures</span>
              <span className="badge-text">Priority support</span>
            </div>
          </div>
          <div className="details-hero-cta">
            <div className="cta-price">₱199/mo</div>
            <div className="cta-note">Cancel anytime • First month ready now</div>
            <button className="btn-hero-upgrade" onClick={handleUpgrade}>
              Unlock Plus
            </button>
          </div>
        </div>

        <div className="details-grid">
          <div className="details-card free">
            <div className="plan-header plan-header-free">Free</div>
            <div className="plan-price plan-price-free">
              ₱0 <span className="per per-free">forever</span>
            </div>
            <ul className="plan-features">
              <li className="included feature-text-free">Town-to-town route selection</li>
              <li className="included feature-text-free">Fare Calculator</li>
              <li className="included feature-text-free">Basic distance calculation</li>
              <li className="included feature-text-free">Estimated travel time</li>
              <li className="excluded feature-text-excluded">Weather Tracking</li>
              <li className="excluded feature-text-excluded">AI-powered insights</li>
            </ul>
            <div className="current-plan">Current Plan</div>
          </div>

          <div className="details-card plus">
            <div className="plan-chip chip-text">Most popular</div>
            <div className="plan-header plan-header-plus">Plus</div>
            <div className="plan-price plan-price-plus">
              ₱199 <span className="per per-plus">/ month</span>
            </div>
            <ul className="plan-features">
              <li className="included feature-text-plus">Everything in Free, plus:</li>
              <li className="included feature-text-plus">Weather Tracking</li>
              <li className="included feature-text-plus">AI-powered insights</li>
              <li className="included feature-text-plus">Route pattern insights</li>
              <li className="included feature-text-plus">Optimal departure windows</li>
              <li className="included feature-text-plus">Priority support</li>
            </ul>
            <button className="btn-upgrade btn-upgrade-plus" onClick={handleUpgrade}>
              Upgrade to Plus
            </button>
          </div>
        </div>

        <p className="details-footnote footnote-text">
          All plans include unlimited route planning. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

export default DetailScreen;
