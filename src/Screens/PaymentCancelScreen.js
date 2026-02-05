import { useNavigate } from "react-router-dom";

function PaymentCancelScreen() {
  const navigate = useNavigate();

  return (
    <div className="jeeproute-page">
      <div className="jeeproute-navbar">
        <div className="brand">JeepRoute</div>
      </div>

      <div className="jeeproute-container payment-container">
        <div className="plan-card plus">
          <div className="plan-header">Payment Cancelled</div>
          <p className="premium-desc">
            Your subscription was not completed. You can try again anytime.
          </p>
          <button
            className="btn-neon-fill"
            onClick={() => navigate("/profile")}
          >
            Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancelScreen;
