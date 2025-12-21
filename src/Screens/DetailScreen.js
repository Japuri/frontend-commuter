import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function DetailScreen({ currentUser }) {
  const navigate = useNavigate();

  return (
    <>
      <button className="floating-back-btn" onClick={() => navigate("/")}>
        ← Back
      </button>

      <Container className="details-container">
        <div className="brand mb-4">Choose Your Plan</div>
        <p className="subtitle">
          Start free and upgrade when you're ready for AI-powered predictions
        </p>

        <div className="details-grid">
          <div className="details-card free">
            <div className="plan-header">Free</div>
            <div className="plan-price">
              ₱0 <span className="per">forever</span>
            </div>
            <ul className="plan-features">
              <li className="included">✓ Town-to-town route selection</li>
              <li className="included">✓ Basic distance calculation</li>
              <li className="excluded">✗ Real-time weather data</li>
              <li className="excluded">✗ Estimated travel time</li>
              <li className="excluded">✗ AI-powered predictions</li>
            </ul>
            <div className="current-plan">Current Plan</div>
          </div>

          <div className="details-card plus">
            <div className="plan-header">Plus</div>
            <div className="plan-price">
              ₱99 <span className="per">/ month</span>
            </div>
            <ul className="plan-features">
              <li className="included">✓ Everything in Free, plus:</li>
              <li className="included">✓ Real-time weather for start & end</li>
              <li className="included">✓ Accurate travel time estimates</li>
              <li className="included">✓ AI traffic pattern analysis</li>
              <li className="included">✓ Weather-based delay predictions</li>
              <li className="included">
                ✓ Optimal departure time recommendations
              </li>
              <li className="included">✓ Priority support</li>
            </ul>
            <button
              className="btn-upgrade"
              onClick={() => {
                if (currentUser) {
                  navigate("/payment");
                } else {
                  navigate("/signin", { state: { redirectTo: "/payment" } });
                }
              }}
            >
              Upgrade to Plus
            </button>
          </div>
        </div>

        <p className="subtitle mt-4">
          All plans include unlimited route planning. Cancel anytime.
        </p>
      </Container>
    </>
  );
}

export default DetailScreen;
