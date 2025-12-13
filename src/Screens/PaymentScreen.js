import { useNavigate } from "react-router-dom";

function PaymentScreen({ currentUser }) {
  const navigate = useNavigate();

  const handleConfirm = () => {
    alert("Payment successful! 🎉 JeepRoute Plus activated.");
    navigate("/details");
    /* Simulate upgrading user to premium */
    if (currentUser) {
      currentUser.is_premium = true;
    }

    navigate("/details");
  };

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
          <div className="plan-header">Upgrade to JeepRoute Plus</div>
          <p className="premium-desc">
            Unlock accurate travel times, weather + traffic insights, and AI
            delay predictions.
          </p>

          <div className="paypal-mock">
            <div className="paypal-logo">PayPal</div>
            <p className="premium-desc">Mock checkout screen</p>

            <div className="payment-summary">
              <p>Plan: JeepRoute Plus</p>
              <p>Price: ₱99 / month</p>
            </div>

            <button
              className="btn-neon-fill"
              onClick={handleConfirm}
              onClickCapture={() => navigate("/")}
            >
              Confirm Payment
            </button>
            <button
              className="btn-neon-outline"
              onClick={() => navigate("/details")}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentScreen;
