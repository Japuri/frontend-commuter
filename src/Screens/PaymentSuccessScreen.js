import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/api";
import authFetch from "../utils/authFetch";

function PaymentSuccessScreen({ currentUser, token }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const executeSubscription = async () => {
      const token_param = searchParams.get("token");
      const ba_token = searchParams.get("ba_token");
      const subscription_id = searchParams.get("subscription_id");
      const plan = searchParams.get("plan") || "plus";

      const paypalToken = subscription_id || token_param || ba_token;

      console.log("PayPal redirect params:", {
        token_param,
        ba_token,
        subscription_id,
        plan,
        allParams: Object.fromEntries(searchParams.entries())
      });

      if (!paypalToken) {
        setError("Invalid payment token");
        setLoading(false);
        return;
      }

      try {
        const response = await authFetch(
          `${API_BASE_URL}/api/paypal/execute-subscription/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({ token: paypalToken, plan }),
          },
          navigate
        );

        if (response.ok) {
          sessionStorage.setItem("showCongrats", "1");
          setTimeout(() => {
            navigate("/profile");
          }, 2000);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to complete subscription");
          setLoading(false);
        }
      } catch (err) {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    };

    if (currentUser && token) {
      executeSubscription();
    } else {
      navigate("/signin");
    }
  }, [searchParams, currentUser, token, navigate]);

  return (
    <div className="jeeproute-page">
      <div className="jeeproute-navbar">
        <div className="brand">JeepRoute</div>
      </div>

      <div className="jeeproute-container payment-container">
        <div className="plan-card plus">
          {loading ? (
            <>
              <div className="plan-header">Processing Payment</div>
              <p className="premium-desc">
                Please wait while we complete your subscription...
              </p>
            </>
          ) : error ? (
            <>
              <div className="plan-header">Payment Failed</div>
              <p className="premium-desc error-message">{error}</p>
              <button
                className="btn-neon-fill"
                onClick={() => navigate("/profile")}
              >
                Back to Profile
              </button>
            </>
          ) : (
            <>
              <div className="plan-header">Success!</div>
              <p className="premium-desc">
                Your subscription has been activated. Redirecting...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccessScreen;
