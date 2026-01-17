import { useState, useEffect, useRef } from "react";
import Spinner from "../Components/Spinner";
import { useNavigate } from "react-router-dom";
import TownSelector from "../Components/TownSelector";
import JeepneyRouteSelector from "../Components/JeepneyRouteSelector";
import JeepneyStopsEstimation from "../Components/JeepneyStopsEstimation";
import { db, getTownById, logTrip } from "./db";
// import JeepneyLegend from "../Components/JeepneyLegend";
import { logTravel } from "../services/travelLogger";
import {
  weatherBadgeFor,
  trafficSeverityFromData,
  trafficBadgeFor,
  confidenceFromIndicators,
  applyPremiumOverrides,
} from "../utils/metrics";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// import { JEEPNEY_ROUTE_COLORS } from '../data/jeepney_routes';

function Homescreen({ currentUser, setCurrentUser }) {
  // AI Suggestion state for premium users
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const handleActivateAIMode = async () => {
    if (!estimation || !currentUser?.is_premium) return;
    setAiLoading(true);
    setAiError("");
    setAiSuggestion(null);
    try {
      // Compose payload for backend
      const payload = {
        weather: estimation.weatherData || {},
        traffic: estimation.trafficData || {},
        distance: estimation.distanceKm,
        time_of_day: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      // Use JWT or session auth if needed
      const resp = await fetch(
        "https://backend-commuter.onrender.com/api/ai-suggestion/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add auth header if needed
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      if (!resp.ok)
        throw new Error("AI suggestion failed: " + (await resp.text()));
      const data = await resp.json();
      setAiSuggestion(data);
    } catch (e) {
      setAiError(e.message || "AI error");
    } finally {
      setAiLoading(false);
    }
  };
  const [startTown, setStartTown] = useState(
    () => sessionStorage.getItem("startTown") || ""
  );
  const [endTown, setEndTown] = useState(
    () => sessionStorage.getItem("endTown") || ""
  );
  // Jeepney route selection state
  const [selectedJeepneyRoute, setSelectedJeepneyRoute] = useState(null);
  const [useJeepneyMode, setUseJeepneyMode] = useState(true);
  // Congratulatory popup state
  const [showCongrats, setShowCongrats] = useState(false);
  // Show stops estimation after planning jeepney route
  const [showJeepneyStops, setShowJeepneyStops] = useState(false);
  const [showPremiumInfo, setShowPremiumInfo] = useState(false);
  const [showUpgradeInfo, setShowUpgradeInfo] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);

  // Ensure selectedJeepneyRoute is not reset when toggling modes
  useEffect(() => {
    if (!useJeepneyMode) {
      setShowJeepneyStops(false);
      setSelectedJeepneyRoute(null); // Reset selected jeepney route when switching to town-to-town
    }
  }, [useJeepneyMode]);

  // Persist town selections in sessionStorage
  const handleSetStartTown = (val) => {
    setStartTown(val);
    setRouteRequested(false);
    try {
      sessionStorage.setItem("startTown", val);
    } catch (e) {}
  };
  const handleSetEndTown = async (val) => {
    setEndTown(val);
    setRouteRequested(false);
    try {
      sessionStorage.setItem("endTown", val);
      // Log trip to backend when user selects an end town
      if (currentUser?.id && currentUser?.token && startTown && val) {
        const endTownData = getTownById(val);
        console.log('Logging trip:', { userId: currentUser.id, startTown, endTown: val });
        const result = await logTrip(currentUser.id, currentUser.token, {
          town_id: val,
          town_name: endTownData?.name || val,
          start_town: startTown,
          distance_km: 0,
          estimated_minutes: 0
        });
        console.log('Trip logged successfully:', result);
      } else {
        console.log('Skipping trip log - missing data:', { 
          hasUser: !!currentUser?.id, 
          hasToken: !!currentUser?.token, 
          hasStartTown: !!startTown, 
          hasEndTown: !!val 
        });
      }
    } catch (e) {
      console.error('Error logging trip:', e);
    }
  };
  const [towns, setTowns] = useState([]);
  const [estimation, setEstimation] = useState(null);
  const [routeRequested, setRouteRequested] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined" && window.__premiumConfig) {
      applyPremiumOverrides(window.__premiumConfig);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.is_premium) {
      setShowUpgradeInfo(false);
    } else {
      setShowPremiumInfo(false);
      setActiveFeature(null);
    }
  }, [currentUser?.is_premium]);

  useEffect(() => {
    if (
      !currentUser?.is_premium ||
      !estimation ||
      estimation.error
    ) {
      setActiveFeature(null);
    }
  }, [currentUser?.is_premium, estimation]);

  useEffect(() => {
    // Fetch Pampanga towns from backend proxy endpoint
    fetch("https://backend-commuter.onrender.com/api/towns/")
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
    if (routeRequested && startTown && endTown && startTown !== endTown) {
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
            const r = await fetch(
              `https://backend-commuter.onrender.com/api/distance/?start=${encodeURIComponent(
                startId
              )}&end=${encodeURIComponent(endId)}`
            );
            if (!r.ok) throw new Error("Distance API error");
            distResp = await r.json();
            try {
              sessionStorage.setItem(
                distanceCacheKey,
                JSON.stringify(distResp)
              );
            } catch (e) {}
          }

          if (cancelled) return;

          const distanceKm =
            distResp.data?.distance_km || distResp.data?.haversine_km || 15.0;
          const minutes =
            distResp.data?.estimated_minutes ||
            Math.round((distanceKm / 25) * 60);

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
              try {
                const js = JSON.parse(cached);
                if (Date.now() - js._ts < 1000 * 60 * 10) return js.data;
              } catch (e) {}
            }
            try {
              const wr = await fetch(
                `https://backend-commuter.onrender.com/api/weather/?town=${encodeURIComponent(
                  townId
                )}`
              );
              if (!wr.ok) return null;
              const wj = await wr.json();
              const data = wj.data || wj;
              try {
                sessionStorage.setItem(
                  key,
                  JSON.stringify({ _ts: Date.now(), data })
                );
              } catch (e) {}
              return data;
            } catch (e) {
              return null;
            }
          }

          const [, endWeather] = await Promise.all([
            loadWeather(startId),
            loadWeather(endId),
          ]);

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
          if (!cancelled)
            setEstimation({
              error: err.message || String(err),
              loading: false,
            });
        }
      }

      fetchDistanceAndWeather();
      return () => {
        cancelled = true;
      };
    } else {
      setEstimation(null);
    }
  }, [startTown, endTown, routeRequested]);

  // Restore towns from sessionStorage after upgrade and trigger estimation
  useEffect(() => {
    if (sessionStorage.getItem("showCongrats")) {
      setShowCongrats(true);
      sessionStorage.removeItem("showCongrats");
    }
    // Always restore towns from sessionStorage after upgrade
    const sTown = sessionStorage.getItem("startTown");
    const eTown = sessionStorage.getItem("endTown");
    if (sTown && sTown !== startTown) setStartTown(sTown);
    if (eTown && eTown !== endTown) setEndTown(eTown);
    // If both towns are present, estimation effect will run
  }, [startTown, endTown]);

  // Congratulatory popup modal
  const CongratsModal = () =>
    showCongrats ? (
      <div className="congrats-modal-overlay">
        <div className="congrats-modal-box">
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#00b894",
              marginBottom: 8,
            }}
          >
            Thank you for being a Plus member!
          </div>
          <div style={{ fontSize: 16, color: "#333", marginBottom: 18 }}>
            You now have access to all premium features.
            <br />
            Enjoy JeepRoute Plus!
          </div>
          <button
            className="btn-neon-fill"
            style={{ minWidth: 120 }}
            onClick={() => setShowCongrats(false)}
          >
            Close
          </button>
        </div>
      </div>
    ) : null;

  const loggedIn = !!currentUser;

  const estimationReady = Boolean(estimation) && !estimation?.loading && !estimation?.error;
  const insightsReady = currentUser?.is_premium && estimationReady;
  const temperature = estimationReady
    ? (estimation?.weatherData?.temp_c ??
        estimation?.weatherData?.temperature ??
        estimation?.weatherData?.temp ??
        null)
    : null;
  const weatherLabel = estimationReady
    ? (estimation?.weatherData?.condition ??
        estimation?.weatherData?.description ??
        estimation?.weather ??
        "Live weather radar")
    : estimation?.weather || "Live weather radar";
  const weatherSummary = estimation
    ? estimation.loading
      ? "Fetching weather..."
      : typeof temperature === "number"
        ? `${Math.round(temperature)}°C • ${weatherLabel}`
        : weatherLabel || "Weather data ready"
    : "Plan a route for weather data";
  const trafficSummary = estimation
    ? estimation.loading
      ? "Calculating traffic..."
      : estimation.traffic || "Traffic pulse ready"
    : "Plan a route for traffic data";
  const aiSummary =
    aiSuggestion?.window ||
    (insightsReady
      ? "AI guidance standing by"
      : estimation?.loading
        ? "Calibrating AI..."
        : "Plan a trip to activate AI");
  const analyticsSummary = estimation
    ? estimation.loading
      ? "Crunching numbers..."
      : typeof estimation.distanceKm === "number"
        ? `${Math.round(estimation.distanceKm)} km range`
        : "Trip analytics dashboard"
    : "Trip analytics dashboard";

  const trafficSeverity = insightsReady
    ? trafficSeverityFromData(estimation.trafficData)
    : 0;
  const weatherBadgeName = insightsReady
    ? weatherBadgeFor(estimation.weather)
    : "badge-info";
  const trafficBadgeName = insightsReady
    ? trafficBadgeFor(estimation.traffic)
    : "badge-info";
  const minEta = insightsReady
    ? Math.max(5, Math.round(estimation.minutes - 4))
    : null;
  const maxEta = insightsReady ? Math.round(estimation.minutes + 6) : null;
  const confidence = insightsReady
    ? confidenceFromIndicators(trafficSeverity, weatherBadgeName)
    : null;

  const premiumFeatureCards = [
    {
      key: "weather",
      icon: "🌦️",
      title: "Weather Monitor",
      status: weatherSummary,
    },
    {
      key: "traffic",
      icon: "🚦",
      title: "Traffic Pulse",
      status: trafficSummary,
    },
    {
      key: "ai",
      icon: "🤖",
      title: "AI Guidance",
      status: aiSummary,
    },
    {
      key: "analytics",
      icon: "📊",
      title: "Route Analytics",
      status: analyticsSummary,
    },
  ];

  const freeFeatureCards = [
    {
      key: "travel",
      icon: "🧭",
      title: "Travel Estimation",
      status: estimation
        ? estimation.loading
          ? "Calculating ETA..."
          : `${estimation.minutes} mins`
        : "Plan a trip to see ETA",
      detail: "Quick arrival estimates for every town-to-town route.",
    },
    {
      key: "distance",
      icon: "📏",
      title: "Distance Tracker",
      status: estimation
        ? estimation.loading
          ? "Measuring distance..."
          : `${estimation.distanceKm ?? "—"} km`
        : "Enter start and end towns",
      detail: "Shows how far your selected route spans across Pampanga.",
    },
  ];

  const handleFeatureClick = (key) => {
    if (!currentUser?.is_premium || !estimation) return;
    setActiveFeature((prev) => (prev === key ? null : key));
  };

  const renderFeaturePopover = () => {
    if (!currentUser?.is_premium || !estimation || !activeFeature) return null;

    const weatherDetails = estimation?.weatherData || {};
    const humidity = weatherDetails.humidity ?? weatherDetails.humidity_pct;
    const wind = weatherDetails.wind_kph ?? weatherDetails.wind_speed_kph;

    let title = "Insights";
    let body = null;

    if (activeFeature === "weather") {
      title = "Live Weather";
      body = (
        <div className="popover-section">
          <div className={`badge ${weatherBadgeName}`} style={{ marginBottom: 8 }}>
            {typeof temperature === "number"
              ? `${Math.round(temperature)}°C • ${weatherLabel}`
              : weatherLabel}
          </div>
          <ul className="popover-list">
            <li>Condition: {weatherLabel || "Unknown"}</li>
            <li>Humidity: {humidity != null ? `${humidity}%` : "N/A"}</li>
            <li>Wind: {wind != null ? `${wind} kph` : "N/A"}</li>
            <li>
              Updated: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </li>
          </ul>
        </div>
      );
    }

    if (activeFeature === "traffic") {
      title = "Traffic & ETA";
      body = (
        <div className="popover-section">
          <p className="popover-line">
            Estimated Time: <strong>{estimation.minutes} mins</strong>
          </p>
          <p className="popover-line">
            Distance: <strong>{estimation.distanceKm ?? "—"} km</strong>
          </p>
          <div className="meter-row" style={{ margin: "10px 0" }}>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${trafficSeverity}%` }} />
            </div>
            <span className={`badge ${trafficBadgeName}`}>{estimation.traffic}</span>
          </div>
          <div className="popover-badges">
            <span className="badge badge-ok">
              Arrival: {minEta}–{maxEta} mins
            </span>
            <span className="badge badge-warn">Confidence: {confidence}</span>
          </div>
        </div>
      );
    }

    if (activeFeature === "ai") {
      title = "AI Guidance";
      body = (
        <div className="popover-section ai">
          <button
            className="btn-neon-fill"
            style={{ width: "100%", marginBottom: 10 }}
            onClick={handleActivateAIMode}
            disabled={aiLoading}
          >
            {aiLoading ? "Summoning AI..." : "Generate AI Suggestion"}
          </button>
          {aiError && (
            <p className="popover-line" style={{ color: "#ff6b6b" }}>
              {aiError}
            </p>
          )}
          {aiSuggestion ? (
            <div className="popover-card">
              <p className="popover-line">
                Optimal Departure: <strong>{aiSuggestion.window || "N/A"}</strong>
              </p>
              <p className="popover-line" style={{ color: "#8abfde" }}>
                {aiSuggestion.rationale || "Insights calibrated"}
              </p>
            </div>
          ) : (
            <p className="popover-line" style={{ color: "#8abfde" }}>
              AI mode provides proactive departure guidance once generated.
            </p>
          )}
        </div>
      );
    }

    if (activeFeature === "analytics") {
      title = "Route Analytics";
      body = (
        <div className="popover-section">
          <ul className="popover-list">
            <li>
              From <strong>{estimation.start?.name || estimation.start?.id}</strong> to
              {" "}
              <strong>{estimation.end?.name || estimation.end?.id}</strong>
            </li>
            <li>Distance: {estimation.distanceKm ?? "—"} km</li>
            <li>ETA: {estimation.minutes} mins ({confidence} confidence)</li>
          </ul>
        </div>
      );
    }

    return (
      <div className="feature-popover" role="dialog" aria-live="polite">
        <div className="feature-popover-head">
          <h4>{title}</h4>
          <button
            type="button"
            className="feature-popover-close"
            aria-label="Close insights"
            onClick={() => setActiveFeature(null)}
          >
            ×
          </button>
        </div>
        {body}
      </div>
    );
  };

  return (
    <>
      {/* <JeepneyLegend /> removed as per request */}
      <CongratsModal />
      <div className="jeeproute-page">
        <div className="jeeproute-navbar">
          <div className="brand">JeepRoute</div>
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
                  className="btn-neon-fill"
                  onClick={() => navigate("/profile")}
                  style={{ marginRight: 8 }}
                >
                  Profile
                </button>
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
          <div className="jeeproute-grid-container">
            {/* Top Left: Jeep Routes */}
            <div className="grid-jeep-routes">
              <div className="subtitle">
                Smart Jeepney Planning for Pampanga Students
              </div>
              <div className="sidebar">
                <div className="plan-card free">
                  {/* Mode Toggle */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '8px', background: 'rgba(30,38,49,0.3)', borderRadius: 8 }}>
                    <button
                      className={useJeepneyMode ? "btn-neon-fill" : "btn-neon-outline"}
                      style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
                      onClick={() => setUseJeepneyMode(true)}
                    >
                      🚍 Jeepney Routes
                    </button>
                    <button
                      className={!useJeepneyMode ? "btn-neon-fill" : "btn-neon-outline"}
                      style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
                      onClick={() => setUseJeepneyMode(false)}
                    >
                      📍 Town to Town
                    </button>
                  </div>

                  {useJeepneyMode ? (
                    <div className="jeeproute-select-block">
                      <JeepneyRouteSelector
                        onRouteSelect={(route) => {
                          setSelectedJeepneyRoute(route);
                          setShowJeepneyStops(false); // Reset stops view on new selection
                        }}
                        selectedRoute={selectedJeepneyRoute}
                      />
                    </div>
                  ) : (
                    <div className="jeeproute-select-block">
                      <div className="plan-header">Select Route</div>
                      <TownSelector
                        towns={towns}
                        startTown={startTown}
                        endTown={endTown}
                        setStartTown={handleSetStartTown}
                        setEndTown={handleSetEndTown}
                        layout="start"
                      />
                      <TownSelector
                        towns={towns}
                        startTown={startTown}
                        endTown={endTown}
                        setStartTown={setStartTown}
                        setEndTown={handleSetEndTown}
                        layout="end"
                      />
                    </div>
                  )}
                  <div className="jeeproute-actions-row">
                    <button
                      className="btn-neon-fill"
                      disabled={useJeepneyMode ? !selectedJeepneyRoute || !selectedJeepneyRoute.stops || selectedJeepneyRoute.stops.length < 2 : (!startTown || !endTown || startTown === endTown)}
                      onClick={() => {
                        if (!currentUser) {
                          navigate("/signin");
                          return;
                        }
                        if (useJeepneyMode) {
                          // Only allow if route has stops
                          if (selectedJeepneyRoute && selectedJeepneyRoute.stops && selectedJeepneyRoute.stops.length >= 2) {
                            setShowJeepneyStops(true);
                          }
                        } else {
                          // Only log if user is authenticated
                          if (currentUser?.id) {
                            let townName = undefined;
                            try {
                              const byId = towns.find(
                                (t) => String(t.id) === String(endTown)
                              );
                              townName = byId?.name;
                              if (!townName) {
                                const fallback = getTownById(endTown);
                                townName = fallback?.name;
                              }
                            } catch {}
                            try {
                              logTravel({
                                user_id: currentUser.id,
                                town_id: endTown,
                                town_name: townName,
                                selected_at: new Date().toISOString(),
                              });
                            } catch {}
                          }
                          setRouteRequested(true);
                        }
                      }}
                    >
                      Plan Route
                    </button>
                  </div>
                </div>
                {estimation?.loading && (
                  <div className="plan-card free" style={{ alignItems: "center" }}>
                    <Spinner size={52} color="#00d4ff" text="Calculating estimation..." />
                  </div>
                )}
              </div>
            </div>

            {/* Top Right: Map */}
            {(!useJeepneyMode || (useJeepneyMode && !showJeepneyStops)) && (
              <div className="grid-map">
                <Mapbox3DMap 
                  estimation={useJeepneyMode ? null : estimation} 
                  selectedJeepneyRoute={useJeepneyMode ? selectedJeepneyRoute : null}
                  key={String(useJeepneyMode) + '-' + String(startTown) + '-' + String(endTown) + '-' + String(routeRequested) + '-' + (selectedJeepneyRoute?.color || '')}
                />
              </div>
            )}
            {/* Show jeepney stops estimation after planning in jeepney mode */}
            {useJeepneyMode && showJeepneyStops && selectedJeepneyRoute && selectedJeepneyRoute.stops && selectedJeepneyRoute.stops.length >= 2 && (
              <div className="grid-map">
                <JeepneyStopsEstimation 
                  key={selectedJeepneyRoute.color || selectedJeepneyRoute.route} 
                  route={selectedJeepneyRoute} 
                  onBack={() => setShowJeepneyStops(false)}
                />
              </div>
            )}

            {/* Bottom: Features Container */}
            <div className="grid-features">
              <div className="features-header">
                Features
                <button
                  type="button"
                  className="premium-info-toggle"
                  aria-label={
                    currentUser?.is_premium
                      ? showPremiumInfo
                        ? "Hide premium benefits"
                        : "Show premium benefits"
                      : showUpgradeInfo
                        ? "Hide upgrade details"
                        : "Show upgrade details"
                  }
                  aria-expanded={currentUser?.is_premium ? showPremiumInfo : showUpgradeInfo}
                  onClick={() => {
                    if (currentUser?.is_premium) {
                      setShowPremiumInfo((prev) => !prev);
                    } else {
                      setShowUpgradeInfo((prev) => !prev);
                    }
                  }}
                >
                  ?
                </button>
              </div>
              {currentUser?.is_premium && showPremiumInfo && (
                <div
                  className="premium-info-popover"
                  role="dialog"
                  aria-modal="false"
                >
                  <button
                    type="button"
                    className="premium-info-close"
                    aria-label="Close premium info"
                    onClick={() => setShowPremiumInfo(false)}
                  >
                    ×
                  </button>
                  <div className="plan-header premium-heading">
                    <span>✨</span>
                    Premium Active
                    <span>✨</span>
                  </div>
                  <p className="premium-desc">
                    You're enjoying exclusive JeepRoute Plus features!
                  </p>
                  <div className="premium-feature-list">
                    <div className="premium-feature">
                      <span>🌦️</span>
                      <span>Real-time weather insights</span>
                    </div>
                    <div className="premium-feature">
                      <span>🚦</span>
                      <span>Live traffic conditions</span>
                    </div>
                    <div className="premium-feature">
                      <span>🤖</span>
                      <span>AI-powered delay predictions</span>
                    </div>
                    <div className="premium-feature">
                      <span>⏰</span>
                      <span>Optimal departure time</span>
                    </div>
                    <div className="premium-feature">
                      <span>📊</span>
                      <span>Advanced route analytics</span>
                    </div>
                  </div>
                  <div className="premium-thanks">
                    Thank you for being a Plus member!
                  </div>
                </div>
              )}
              {!currentUser?.is_premium && showUpgradeInfo && (
                <div
                  className="premium-info-popover upgrade-popover"
                  role="dialog"
                  aria-modal="false"
                >
                  <button
                    type="button"
                    className="premium-info-close"
                    aria-label="Close upgrade info"
                    onClick={() => setShowUpgradeInfo(false)}
                  >
                    ×
                  </button>
                  <div className="plan-header premium-heading">
                    <span>🚀</span>
                    Unlock JeepRoute Plus
                  </div>
                  <ul className="popover-list">
                    <li>🌦️ Real-time weather + traffic signals</li>
                    <li>🤖 AI-powered departure windows</li>
                    <li>📊 Advanced route analytics & history</li>
                  </ul>
                  <button
                    className="btn-upgrade"
                    style={{ marginTop: 12, width: "100%" }}
                    onClick={() => {
                      setShowUpgradeInfo(false);
                      navigate('/details');
                    }}
                  >
                    View Plans
                  </button>
                </div>
              )}
              <div className="features-content">
                {currentUser?.is_premium ? (
                  <>
                    <div className="features-grid-cards">
                      {premiumFeatureCards.map((card) => (
                        <button
                          type="button"
                          className={`feature-card${activeFeature === card.key ? " active" : ""}`}
                          key={card.title}
                          onClick={() => handleFeatureClick(card.key)}
                          aria-pressed={activeFeature === card.key}
                          disabled={!insightsReady}
                        >
                          <div className="feature-icon">{card.icon}</div>
                          <div className="feature-body">
                            <p className="feature-title">{card.title}</p>
                            <p className="feature-status">{card.status}</p>
                            <p className="feature-copy">{card.detail}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="feature-grid-shell">
                      <div className="features-grid-cards free-tier">
                        {freeFeatureCards.map((card) => (
                          <div className="feature-card" key={card.key}>
                            <div className="feature-body">
                              <p className="feature-title">{card.title}</p>
                              <p className="feature-status">{card.status}</p>
                              <p className="feature-copy">{card.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="feature-footer-note">
                      Tap the "?" icon to preview Plus upgrades.
                    </div>
                  </>
                )}
              </div>
              {currentUser?.is_premium && renderFeaturePopover()}
            </div>

            {/* Bottom Right: Ask AI */}
            <div className="grid-ask-ai">
              <div className="ask-ai-header">Ask AI</div>
              <div className="ask-ai-content">
                {currentUser?.is_premium && estimation && !estimation.loading ? (
                  <>
                    <button
                      className="btn-neon-fill"
                      style={{ width: '100%', fontSize: 24, padding: '8px' }}
                      onClick={handleActivateAIMode}
                      disabled={aiLoading}
                    >
                      {aiLoading ? '⏳' : '🤖'}
                    </button>
                    {aiSuggestion && (
                      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text)', textAlign: 'center' }}>
                        <strong>{aiSuggestion.window || 'N/A'}</strong>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>
                    <span style={{ fontSize: '2.5rem' }}>🤖</span>
                    <p style={{ marginTop: 4 }}>Premium</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mapbox 3D Map Component
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function Mapbox3DMap({ estimation, selectedJeepneyRoute }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState(null);

  // Helper: get traffic color
  function getTrafficColor(trafficData) {
    const severity = trafficSeverityFromData
      ? trafficSeverityFromData(trafficData)
      : 0;
    if (severity >= 70) return "#e74c3c"; // red
    if (severity >= 40) return "#f1c40f"; // yellow
    return "#27ae60"; // green
  }

  // Fetch road-following route from Mapbox Directions API
  useEffect(() => {
    async function fetchRoute() {
      if (!estimation?.start || !estimation?.end) {
        setRouteCoords(null);
        return;
      }
      const start = `${estimation.start.lng},${estimation.start.lat}`;
      const end = `${estimation.end.lng},${estimation.end.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (coords && coords.length > 1) {
          setRouteCoords(coords);
        } else {
          setRouteCoords(null);
        }
      } catch {
        setRouteCoords(null);
      }
    }
    fetchRoute();
  }, [estimation]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!estimation?.start || !estimation?.end) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }
    if (!routeCoords) return;

    // Clean up previous map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: routeCoords[0],
      zoom: 12,
      pitch: 50,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl());

    map.on("load", () => {
      // 3D buildings
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) =>
          layer.type === "symbol" && layer.layout && layer.layout["text-field"]
      )?.id;
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6,
          },
        },
        labelLayerId
      );

      // Add route line with traffic color
      const trafficColor = getTrafficColor(estimation.trafficData);
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: routeCoords,
          },
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": trafficColor,
          "line-width": 5,
        },
      });

      // Add start marker
      new mapboxgl.Marker({ color: "#0074D9" })
        .setLngLat(routeCoords[0])
        .addTo(map);
      // Add end marker
      new mapboxgl.Marker({ color: "#FF4136" })
        .setLngLat(routeCoords[routeCoords.length - 1])
        .addTo(map);

      // Add jeepney stops if a route is selected and has stops
      if (selectedJeepneyRoute && selectedJeepneyRoute.stops && selectedJeepneyRoute.stops.length > 0) {
        selectedJeepneyRoute.stops.forEach((stop, idx) => {
          const marker = new mapboxgl.Marker({ color: selectedJeepneyRoute.hex })
            .setLngLat([stop.lng, stop.lat])
            .addTo(map);
          // Add a popup with stop number
          const stopNum = idx + 1;
          let suffix = 'th';
          if (stopNum === 1) suffix = 'st';
          else if (stopNum === 2) suffix = 'nd';
          else if (stopNum === 3) suffix = 'rd';
          marker.setPopup(new mapboxgl.Popup({ offset: 18 })
            .setText(`${stopNum}${suffix} stop: ${stop.name}`));
        });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [estimation, routeCoords, selectedJeepneyRoute]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "400px",
        borderRadius: 12,
        overflow: "hidden",
        background: "#eaf6ff",
      }}
    >
      {!estimation?.start || !estimation?.end ? (
        <div style={{ textAlign: "center", paddingTop: 120, color: "#888" }}>
          Selected route shows here
        </div>
      ) : null}
      {estimation?.start && estimation?.end && !routeCoords && (
        <div style={{ textAlign: "center", paddingTop: 120, color: "#888" }}>
          Loading road route...
        </div>
      )}
    </div>
  );
}

export default Homescreen;
