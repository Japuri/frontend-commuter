import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../utils/api";
import authFetch from "../utils/authFetch";
import { logout as authLogout } from "../services/auth";

function PaymentScreen({ currentUser, token }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  const [navUserOpen, setNavUserOpen] = useState(false);
  const navUserRef = useRef(null);
  const loggedIn = !!currentUser;
  const planType = location.state?.plan || "plus";

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!currentUser || !token) return;
    
    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/subscription/status/`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
        navigate
      );
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.status);
      }
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
    }
  }, [currentUser, token, navigate]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navUserRef.current && !navUserRef.current.contains(e.target)) {
        setNavUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpgrade = async () => {
    if (!currentUser || !token) {
      navigate("/signin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/paypal/create-subscription/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ plan: planType }),
        },
        navigate
      );

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.approval_url;
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create subscription");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentUser || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/paypal/cancel-subscription/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
        navigate
      );

      if (response.ok) {
        await fetchSubscriptionStatus();
        navigate("/profile");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to cancel subscription");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const planDetails = {
    plus: {
      name: "JeepRoute Plus",
      price: "₱199",
      features: [
        "Accurate travel times",
        "Weather insights",
        "Traffic updates",
        "Basic AI predictions",
      ],
    },
    premium: {
      name: "JeepRoute Premium",
      price: "₱199",
      features: [
        "All Plus features",
        "Advanced AI predictions",
        "Priority support",
        "Offline maps",
        "Custom routes",
      ],
    },
  };

  const plan = planDetails[planType];
  const helloName = (currentUser?.username || currentUser?.email || "User").split("@")[0];

  return (
    <div className="jeeproute-page home-landing-page payment-page">
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
                <button className="btn-neon-outline" onClick={() => navigate("/signin")}>Sign In</button>
                <button className="btn-neon-fill" onClick={() => navigate("/signup")}>Get Started</button>
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
                      onClick={() => { setNavUserOpen(false); navigate("/profile"); }}
                    >
                      Profile
                    </button>
                    <button
                      className="nav-user-option nav-user-option-signout"
                      onClick={() => {
                        setNavUserOpen(false);
                        try { authLogout(); } catch {}
                        try { localStorage.removeItem("currentUser"); } catch {}
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

      <div className="payment-hero">
        <div className="payment-hero__badge">Secure Checkout</div>
        <h1 className="payment-hero__title">{plan.name}</h1>
        <p className="payment-hero__copy">
          Unlock premium features for better travel planning. Manage your plan anytime.
        </p>
      </div>

      <div className="jeeproute-container payment-container">
        <div className="payment-shell">
          <div className="payment-card">
            <div className="payment-card__header">
              <div>
                <div className="payment-card__label">Plan</div>
                <div className="payment-card__title">{plan.name}</div>
              </div>
              <div className="payment-card__price">
                <span className="payment-card__amount">{plan.price}</span>
                <span className="payment-card__period">/ month</span>
              </div>
            </div>

            <div className="payment-summary">
              {subscriptionStatus === "free" ? (
                <>
                  <div className="payment-summary__title">What you get</div>
                  <ul className="payment-summary__features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div className="payment-summary__title">Subscription status</div>
                  <div className="payment-summary__status">
                    <span>Current Plan:</span>
                    <strong>{subscriptionStatus}</strong>
                  </div>
                  <div className="payment-summary__status">
                    <span>Status:</span>
                    <strong>Active</strong>
                  </div>
                </>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {subscriptionStatus === "free" ? (
              <div className="payment-actions">
                <button
                  className="btn-neon-fill"
                  onClick={handleUpgrade}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Subscribe with PayPal"}
                </button>
                <button
                  className="btn-neon-outline"
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                >
                  Back to Profile
                </button>
              </div>
            ) : (
              <div className="payment-actions">
                <button
                  className="btn-neon-outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Cancel Subscription"}
                </button>
                <button
                  className="btn-neon-fill"
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                >
                  Back to Profile
                </button>
              </div>
            )}
          </div>

          <div className="payment-panel">
            <div className="payment-panel__title">Why upgrade?</div>
            <div className="payment-panel__copy">
              JeepRoute Plus keeps your commute smooth with smarter ETAs, live context, and premium insights.
            </div>
            <div className="payment-panel__list">
              <div className="payment-panel__item">
                <span>⚡</span>
                <div>
                  <strong>Faster planning</strong>
                  <p>See smarter route predictions instantly.</p>
                </div>
              </div>
              <div className="payment-panel__item">
                <span>🌦️</span>
                <div>
                  <strong>Live context</strong>
                  <p>Weather + route insights tailored for you.</p>
                </div>
              </div>
              <div className="payment-panel__item">
                <span>🤖</span>
                <div>
                  <strong>AI guidance</strong>
                  <p>Get tips on optimal departure windows.</p>
                </div>
              </div>
            </div>
            <div className="payment-panel__note">Cancel anytime. Secure checkout via PayPal.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentScreen;
