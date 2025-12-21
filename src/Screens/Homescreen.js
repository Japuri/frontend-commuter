import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TownSelector from "../Components/TownSelector";
import {
  db,
  getTownById,
  getWeatherForTown,
  getTrafficForTown,
} from "./mock_db";
import { estimateTravel } from "../utils/estimation";
import {
  weatherBadgeFor,
  trafficSeverityFromData,
  trafficBadgeFor,
  confidenceFromIndicators,
  applyPremiumOverrides,
} from "../utils/metrics";
import distances from "../data/distances.json";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";

function Homescreen({ currentUser, setCurrentUser }) {
  const [startTown, setStartTown] = useState("");
  const [endTown, setEndTown] = useState("");
  const [towns, setTowns] = useState([]);
  const [estimation, setEstimation] = useState(null);
  const navigate = useNavigate();
  const premiumCardRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.__premiumConfig) {
      applyPremiumOverrides(window.__premiumConfig);
    }
  }, []);

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

      const weatherData = getWeatherForTown(end.id)?.weather_data;
      const weather = weatherData?.condition || "Unknown";
      const trafficData = getTrafficForTown(end.id)?.traffic_data || {};
      const traffic = trafficData?.congestion_level || "Unknown";

      const result = estimateTravel({
        distanceKm,
        weatherCondition: weather,
        congestionLevel: traffic,
        avgSpeedKph: trafficData?.avg_speed_kph,
      });

      setEstimation({
        minutes: result.minutes,
        rationale: result.rationale,
        distanceKm,
        weather,
        traffic,
        start,
        end,
        trafficData,
        weatherData,
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
        <div className="brand">
          JeepRoute{" "}
          <button className="btn-upgrade" onClick={() => {
            if (currentUser?.is_premium) {
              premiumCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              premiumCardRef.current?.classList.add("flash-highlight");
              setTimeout(() => premiumCardRef.current?.classList.remove("flash-highlight"), 1200);
            } else {
              navigate("/details");
            }
          }}>
            Plans
          </button>{" "}
        </div>
        <div className="header-actions">
          {!loggedIn && (
            <>
              <button
                className="btn-neon-outline"
                onClick={() => navigate("/signin")}
              >
                Sign In
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
            <>
              <span className="welcome-msg" style={{ marginRight: 12 }}>
                Hi, {currentUser?.email || "User"}
              </span>
              <button
                className="btn-neon-outline"
                onClick={() => {
                  setCurrentUser(null);
                  localStorage.removeItem("currentUser");
                  navigate("/");
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
      <div className="jeeprout-layout">
        <div className="jeeproute-container">
          <div className="jeeproute-left">
            <div className="subtitle">
              Smart Jeepney Planning for Pampanga Students
            </div>
            <div className="sidebar">
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
                  <p className="included">
                    Distance: {estimation.distanceKm} km
                  </p>
                  {currentUser?.is_premium && (
                    (() => {
                      const trafficSeverity = trafficSeverityFromData(estimation.trafficData);
                      const weatherBadge = weatherBadgeFor(estimation.weather);
                      const trafficBadge = trafficBadgeFor(estimation.traffic);
                      const minEta = Math.max(5, Math.round(estimation.minutes - 4));
                      const maxEta = Math.round(estimation.minutes + 6);
                      const confidence = confidenceFromIndicators(trafficSeverity, weatherBadge);
                      return (
                        <div className="premium-info">
                          <div className="premium-grid">
                            <div className="premium-tile">
                              <div className="premium-title"><span>🌦️</span> Weather</div>
                              <div className={`badge ${weatherBadge}`}>
                                <span>{estimation.weather}</span>
                              </div>
                            </div>

                            <div className="premium-tile">
                              <div className="premium-title"><span>🚦</span> Traffic</div>
                              <div className="meter-row">
                                <div className="meter-track">
                                  <div className="meter-fill" style={{ width: `${trafficSeverity}%` }} />
                                </div>
                                <span className={`badge ${trafficBadge} nowrap`}>{estimation.traffic}</span>
                              </div>
                            </div>

                            <div className="premium-tile">
                              <div className="premium-title"><span>🧠</span> Rationale</div>
                              <div className="premium-desc" style={{ color: '#a9c3d7' }}>{estimation.rationale}</div>
                            </div>
                          </div>
                          <div className="premium-footer">
                            <div className="badge badge-ok">Arrival Window: {minEta}–{maxEta} mins</div>
                            <div className="badge badge-warn">Confidence: {confidence}</div>
                            <div className="badge badge-info">✨ Premium Insights enabled</div>
                          </div>
                          <div className="premium-desc" style={{ marginTop: 8, color: '#7fa2bd' }}>
                            Ai Rationale Here
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {currentUser?.is_premium && (
                <div className="plan-card plus premium-card" ref={premiumCardRef}>
                  <div className="premium-watermark">⚡</div>
                  <div className="plan-header premium-heading">
                    <span>✨</span>
                    Premium Active
                    <span>✨</span>
                  </div>
                  <p className="premium-desc">
                    You're enjoying exclusive JeepRoute Plus features!
                  </p>
                  <div className="premium-feature-list">
                    <div className="premium-feature"><span>🌦️</span><span>Real-time weather insights</span></div>
                    <div className="premium-feature"><span>🚦</span><span>Live traffic conditions</span></div>
                    <div className="premium-feature"><span>🤖</span><span>AI-powered delay predictions</span></div>
                    <div className="premium-feature"><span>⏰</span><span>Optimal departure time</span></div>
                    <div className="premium-feature"><span>📊</span><span>Advanced route analytics</span></div>
                  </div>
                  <div className="premium-thanks">🎉 Thank you for being a Plus member!</div>
                </div>
              )}
            </div>
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
                <Marker
                  position={[estimation.start.lat, estimation.start.lng]}
                />
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
    </div>
  );
}

export default Homescreen;
