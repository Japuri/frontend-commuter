import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TownSelector from "../Components/TownSelector";
import {
  db,
  getTownById,
  getWeatherForTown,
  getTrafficForTown,
} from "./db";
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
    // Fetch Pampanga towns from backend proxy endpoint
    fetch("http://localhost:8000/api/towns/")
      .then((res) => {
        if (!res.ok) throw new Error("Backend towns API error");
        return res.json();
      })
      .then((data) => {
        setTowns(data);
      })
      .catch(() => {
        // fallback to local db if backend API fails
        setTowns(db.towns);
      });
  }, []);

  useEffect(() => {
    if (startTown && endTown && startTown !== endTown) {
      let cancelled = false;
      setEstimation({ loading: true });

      const startId = startTown;
      const endId = endTown;

      const distanceCacheKey = `distance:${startId}:${endId}`;
      const cachedDistance = sessionStorage.getItem(distanceCacheKey);

      async function fetchDistanceAndWeather() {
        try {
          let distResp;
          if (cachedDistance) {
            distResp = JSON.parse(cachedDistance);
          } else {
            const r = await fetch(`http://localhost:8000/api/distance/?start=${encodeURIComponent(startId)}&end=${encodeURIComponent(endId)}`);
            if (!r.ok) throw new Error('Distance API error');
            distResp = await r.json();
            try { sessionStorage.setItem(distanceCacheKey, JSON.stringify(distResp)); } catch(e){ }
          }

          if (cancelled) return;

          const distanceKm = distResp.data?.distance_km || distResp.data?.haversine_km || 15.0;
          const minutes = distResp.data?.estimated_minutes || Math.round((distanceKm / 25) * 60);

          // Resolve map coords: prefer coords returned by the API, otherwise fallback to local db
          const startCoords = distResp.start_coords || {};
          const endCoords = distResp.end_coords || {};
          const startLocal = getTownById(startId) || {};
          const endLocal = getTownById(endId) || {};

          const startObj = {
            id: startId,
            name: startLocal.name || distResp.start || startId,
            lat: startCoords.lat || startLocal.lat || 15.0,
            lng: startCoords.lon || startLocal.lng || 120.6,
          };
          const endObj = {
            id: endId,
            name: endLocal.name || distResp.end || endId,
            lat: endCoords.lat || endLocal.lat || 15.0,
            lng: endCoords.lon || endLocal.lng || 120.6,
          };

          // Weather: cache per-town in sessionStorage as well (10 min)
          async function loadWeather(townId) {
            const key = `weather:${townId}`;
            const cached = sessionStorage.getItem(key);
            if (cached) {
              try { const js = JSON.parse(cached); if (Date.now() - js._ts < 1000 * 60 * 10) return js.data; } catch(e){}
            }
            try {
              const wr = await fetch(`http://localhost:8000/api/weather/?town=${encodeURIComponent(townId)}`);
              if (!wr.ok) return null;
              const wj = await wr.json();
              const data = wj.data || wj;
              try { sessionStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data })); } catch(e){}
              return data;
            } catch (e) { return null; }
          }

          const [startWeather, endWeather] = await Promise.all([loadWeather(startId), loadWeather(endId)]);

          if (cancelled) return;

          setEstimation({
            minutes,
            rationale: distResp.data?.method || "heuristic",
            distanceKm,
            weather: endWeather?.condition || "Unknown",
            traffic: "Unknown",
            start: startObj,
            end: endObj,
            trafficData: {},
            weatherData: endWeather,
            loading: false,
          });
        } catch (err) {
          console.error("Estimation error:", err);
          if (!cancelled) setEstimation({ error: err.message || String(err), loading: false });
        }
      }

      fetchDistanceAndWeather();
      return () => { cancelled = true; };
    } else {
      setEstimation(null);
    }
  }, [startTown, endTown]);

  const loggedIn = !!currentUser;

  return (
    <div className="jeeproute-page">
      <div className="jeeproute-navbar">
        <div className="brand">
          JeepRoute
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
                Hi, {(currentUser?.email || "User").split("@")[0]}
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

              {estimation && !estimation.loading && !estimation.error && (
                <div className="plan-card free">
                  <div className="plan-header">Travel Estimation</div>
                  <p className="included">
                    Estimated Time: {estimation.minutes} mins
                  </p>
                  <p className="included">
                    Distance: {estimation.distanceKm} km
                  </p>
                  {currentUser?.is_premium ? (
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
                                <span>{estimation.weatherData ? `${estimation.weatherData.temp_c}°C • ${estimation.weatherData.condition || estimation.weatherData.description}` : estimation.weather}</span>
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
                  ) : (
                    <div className="premium-locked-container">
                      <div className="premium-locked-blur" />
                      <div className="premium-locked-content">
                        <span className="premium-locked-icon">✨</span>
                        <div className="premium-locked-title">Premium Insights</div>
                        <div className="premium-locked-desc">Upgrade now to unlock real-time weather, traffic, and AI-powered route analytics!</div>
                        <button className="btn-upgrade" onClick={() => navigate('/details')}>Upgrade Now</button>
                      </div>
                    </div>
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
