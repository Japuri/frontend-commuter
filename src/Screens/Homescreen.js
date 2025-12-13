import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TownSelector from "../Components/TownSelector";
import {
  db,
  getTownById,
  getWeatherForTown,
  getTrafficForTown,
} from "./mock_db";
import { estimateTravel } from "../utils/estimation";
import distances from "../data/distances.json";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";

function Homescreen({ currentUser }) {
  const [startTown, setStartTown] = useState("");
  const [endTown, setEndTown] = useState("");
  const [towns, setTowns] = useState([]);
  const [estimation, setEstimation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setTowns(db.towns);
  }, []);

  useEffect(() => {
    if (startTown && endTown && startTown !== endTown) {
      const start = getTownById(parseInt(startTown));
      const end = getTownById(parseInt(endTown));

      const key = `${start.id}-${end.id}`;
      const reverseKey = `${end.id}-${start.id}`;
      const distanceKm = distances[key] || distances[reverseKey] || 15.0;

      const weather =
        getWeatherForTown(end.id)?.weather_data?.condition || "Unknown";
      const traffic =
        getTrafficForTown(end.id)?.traffic_data?.congestion_level || "Unknown";

      const result = estimateTravel({
        distanceKm,
        weatherCondition: weather,
        congestionLevel: traffic,
      });

      setEstimation({
        minutes: result.minutes,
        rationale: result.rationale,
        distanceKm,
        weather,
        traffic,
        start,
        end,
      });
      console.log("Start town:", start);
      console.log("End town:", end);
    } else {
      setEstimation(null);
    }
  }, [startTown, endTown]);

  const loggedIn = !!currentUser;

  return (
    <div className="jeeproute-page">
      <div className="jeeproute-navbar">
        <div className="brand">JeepRoute</div>
        <div className="header-actions">
          {!loggedIn && (
            <>
              <button
                className="btn-neon-outline"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                className="btn-neon-fill"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>
            </>
          )}
          {loggedIn && (
            <span className="welcome-msg">Hi, {currentUser.username}</span>
          )}
        </div>
      </div>

      <div className="jeeproute-container">
        <div className="jeeproute-left">
          <div className="subtitle">
            Smart Jeepney Planning for Pampanga Students
          </div>

          <div className="plan-card free">
            <div className="plan-header">Select Route</div>
            <TownSelector
              towns={towns}
              startTown={startTown}
              endTown={endTown}
              setStartTown={setStartTown}
              setEndTown={setEndTown}
              layout="start"
            />
            <TownSelector
              towns={towns}
              startTown={startTown}
              endTown={endTown}
              setStartTown={setStartTown}
              setEndTown={setEndTown}
              layout="end"
            />
          </div>

          {estimation && (
            <div className="plan-card free">
              <div className="plan-header">Travel Estimation</div>
              <p className="included">
                Estimated Time: {estimation.minutes} mins
              </p>
              <p className="included">Distance: {estimation.distanceKm} km</p>
              {currentUser?.is_premium && (
                <>
                  <p className="premium-desc">
                    Weather: {estimation.weather}
                    <br />
                    Traffic: {estimation.traffic}
                    <br />
                    Rationale: {estimation.rationale}
                  </p>
                  <p className="premium-extra">
                    ✨ Premium Insights: AI delay prediction & optimal departure
                    time (mock data)
                  </p>
                </>
              )}
            </div>
          )}

          {!currentUser?.is_premium && (
            <div className="plan-card plus">
              <div className="plan-header">Premium Feature</div>
              <p className="premium-desc">
                Unlock accurate travel times with Plus
              </p>
              <button
                className="btn-upgrade"
                onClick={() => navigate(loggedIn ? "/details" : "/login")}
              >
                Upgrade Now
              </button>
            </div>
          )}

          {currentUser?.is_premium && (
            <div className="plan-card plus">
              <div className="plan-header">Premium Active</div>
              <p className="premium-desc">
                You’re enjoying JeepRoute Plus features 🎉
              </p>
            </div>
          )}
        </div>

        <div className="jeeproute-map">
          {estimation?.start && estimation?.end ? (
            <MapContainer
              center={[estimation.start.lat, estimation.start.lng]}
              zoom={9.95}
              style={{ height: "550px", width: "100%" }}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              doubleClickZoom={false}
              touchZoom={true}
              boxZoom={false}
              minZoom={9.95}
              maxZoom={11}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[estimation.start.lat, estimation.start.lng]} />
              <Marker position={[estimation.end.lat, estimation.end.lng]} />
              <Polyline
                positions={[
                  [estimation.start.lat, estimation.start.lng],
                  [estimation.end.lat, estimation.end.lng],
                ]}
              />
            </MapContainer>
          ) : (
            <p className="map-placeholder">Selected route shows here</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Homescreen;
