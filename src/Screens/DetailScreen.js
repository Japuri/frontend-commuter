import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function DetailScreen({ currentUser }) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (currentUser) {
      navigate("/payment");
    } else {
      navigate("/signin", { state: { redirectTo: "/payment" } });
    }
  };

  return (
    <>
      <button className="floating-back-btn" onClick={() => navigate("/")}>
        ← Back
      </button>

      <Container className="details-container">
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
            <div className="cta-price">₱99/mo</div>
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
              <li className="included feature-text-free">Basic distance calculation</li>
              <li className="excluded feature-text-excluded">Real-time weather data</li>
              <li className="excluded feature-text-excluded">Estimated travel time</li>
              <li className="excluded feature-text-excluded">AI-powered predictions</li>
            </ul>
            <div className="current-plan">Current Plan</div>
          </div>

          <div className="details-card plus">
            <div className="plan-chip chip-text">Most popular</div>
            <div className="plan-header plan-header-plus">Plus</div>
            <div className="plan-price plan-price-plus">
              ₱99 <span className="per per-plus">/ month</span>
            </div>
            <ul className="plan-features">
              <li className="included feature-text-plus">Everything in Free, plus:</li>
              <li className="included feature-text-plus">Live weather at start & end</li>
              <li className="included feature-text-plus">Accurate AI travel time</li>
              <li className="included feature-text-plus">Traffic pattern insights</li>
              <li className="included feature-text-plus">Weather-based delay signals</li>
              <li className="included feature-text-plus">Optimal departure windows</li>
              <li className="included feature-text-plus">Priority support</li>
            </ul>
            <button className="btn-upgrade btn-upgrade-plus" onClick={handleUpgrade}>
              Upgrade to Plus
            </button>
          </div>
        </div>

        <p className="subtitle mt-4 details-footnote footnote-text">
          All plans include unlimited route planning. Cancel anytime.
        </p>
      </Container>
    </>
  );
}

export default DetailScreen;
