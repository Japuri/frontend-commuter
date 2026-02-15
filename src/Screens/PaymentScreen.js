import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/api";
import authFetch from "../utils/authFetch";

function PaymentScreen({ currentUser, token }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  const planType = location.state?.plan || "plus";

  useEffect(() => {
    fetchSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubscriptionStatus = async () => {
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
  };

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
      price: "₱99",
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

  return (
    <div className="jeeproute-page payment-page">
      <div className="jeeproute-navbar">
        <div className="navbar-shell">
          <div className="navbar-brand-block">
            <div className="navbar-badge" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-truck-front" viewBox="0 0 16 16">
                <path d="M5 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0m8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-6-1a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2zM4 2a1 1 0 0 0-1 1v3.9c0 .625.562 1.092 1.17.994C5.075 7.747 6.792 7.5 8 7.5s2.925.247 3.83.394A1.008 1.008 0 0 0 13 6.9V3a1 1 0 0 0-1-1zm0 1h8v3.9q0 .002 0 0l-.002.004-.005.002h-.004C11.088 6.761 9.299 6.5 8 6.5s-3.088.26-3.99.406h-.003l-.005-.002L4 6.9q0 .002 0 0z"/> <path d="M1 2.5A2.5 2.5 0 0 1 3.5 0h9A2.5 2.5 0 0 1 15 2.5v9c0 .818-.393 1.544-1 2v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V14H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a2.5 2.5 0 0 1-1-2zM3.5 1A1.5 1.5 0 0 0 2 2.5v9A1.5 1.5 0 0 0 3.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 1z"/>
              </svg>
            </div>
            <div className="navbar-brand-copy">
              <span className="navbar-brand-title">JeepRoute</span>
              <span className="navbar-brand-tagline">Pampanga commute lab</span>
            </div>
          </div>
          <div className="header-actions navbar-actions">
            <span className="navbar-greeting">
              Hi, {currentUser?.username || "Guest"}
            </span>
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
                  <p>Weather + traffic insights tailored for you.</p>
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
