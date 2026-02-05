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
    <div className="jeeproute-page">
      <div className="jeeproute-navbar">
        <div className="brand">JeepRoute</div>
        <div className="header-actions">
          <span className="welcome-msg">
            Hi, {currentUser?.username || "Guest"}
          </span>
        </div>
      </div>

      <div className="jeeproute-container payment-container">
        <div className="plan-card plus">
          <div className="plan-header">{plan.name}</div>
          <p className="premium-desc">
            Unlock premium features for better travel planning.
          </p>

          {subscriptionStatus === "free" ? (
            <>
              <div className="payment-summary">
                <p>Plan: {plan.name}</p>
                <p>Price: {plan.price} / month</p>
                <ul className="feature-list">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>

              {error && <div className="error-message">{error}</div>}

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
            </>
          ) : (
            <>
              <div className="payment-summary">
                <p>Current Plan: {subscriptionStatus}</p>
                <p>Status: Active</p>
              </div>

              {error && <div className="error-message">{error}</div>}

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentScreen;
