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
  // Multi-trip planning state
  const [plannedTrips, setPlannedTrips] = useState([]); // Array of selected routes
  const [currentRoute, setCurrentRoute] = useState(null); // Route being selected
  // AI Suggestion state for premium users
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // --- Use Mapbox Directions API for real trip estimation ---
  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
  const [tripStats, setTripStats] = useState([]); // [{distance, duration, cost, stopEtas: [{name, eta}]}]

  useEffect(() => {
    async function fetchAllTripStats() {
      const stats = await Promise.all(
        plannedTrips.map(async (trip) => {
          if (!trip.stops || trip.stops.length < 2) return { distance: 0, duration: 0, cost: 0, stopEtas: [] };
          // Build coordinates string for Mapbox API
          const coords = trip.stops.map(s => `${s.lng},${s.lat}`).join(';');
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
          try {
            const res = await fetch(url);
            const data = await res.json();
            const route = data.routes?.[0];
            if (route && data.waypoints) {
              // Mapbox returns distance in meters, duration in seconds
              const distanceKm = route.distance / 1000;
              const durationMin = Math.round(route.duration / 60);
              const cost = 12 + Math.ceil(distanceKm * 2);
              // Calculate ETA for each stop
              let stopEtas = [];
              let cumulativeSec = 0;
              if (route.legs && route.legs.length === trip.stops.length - 1) {
                stopEtas.push({ name: trip.stops[0].name, eta: 0 });
                for (let i = 0; i < route.legs.length; i++) {
                  cumulativeSec += route.legs[i].duration;
                  stopEtas.push({ name: trip.stops[i + 1].name, eta: Math.round(cumulativeSec / 60) });
                }
              }
              return { distance: distanceKm, duration: durationMin, cost, stopEtas };
            }
          } catch {}
          return { distance: 0, duration: 0, cost: 0, stopEtas: [] };
        })
      );
      setTripStats(stats);
    }
    if (plannedTrips.length > 0) fetchAllTripStats();
    else setTripStats([]);
  }, [plannedTrips]);

  // Calculate totals from tripStats
  const totalDistance = tripStats.reduce((sum, t) => sum + t.distance, 0).toFixed(2);
  const totalTime = tripStats.reduce((sum, t) => sum + t.duration, 0);
  const totalCost = tripStats.reduce((sum, t) => sum + t.cost, 0);

  // Add current selected route to planned trips
  const handleAddTrip = () => {
    if (currentRoute) {
      setPlannedTrips([...plannedTrips, currentRoute]);
      setCurrentRoute(null);
    }
  };

  // Remove a trip from planned trips
  const handleRemoveTrip = (idx) => {
    setPlannedTrips(plannedTrips.filter((_, i) => i !== idx));
  };
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

  // Clear AI suggestion whenever the selected towns change
  useEffect(() => {
    setAiSuggestion(null);
    setAiError("");
  }, [startTown, endTown]);
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
        await logTrip(currentUser.id, currentUser.token, {
          town_id: val,
          town_name: endTownData?.name || val,
          start_town: startTown,
          distance_km: 0,
          estimated_minutes: 0
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
      className: "feature-card-blue",
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
      className: "feature-card-green",
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
      <CongratsModal />
      <div className="jeeproute-page dashboard-shell">
        <div className="jeeproute-navbar">
          <div className="navbar-shell">
            <div className="navbar-brand-block">
              <div className="navbar-badge" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-truck-front" viewBox="0 0 16 16"> <path d="M5 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0m8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-6-1a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2zM4 2a1 1 0 0 0-1 1v3.9c0 .625.562 1.092 1.17.994C5.075 7.747 6.792 7.5 8 7.5s2.925.247 3.83.394A1.008 1.008 0 0 0 13 6.9V3a1 1 0 0 0-1-1zm0 1h8v3.9q0 .002 0 0l-.002.004-.005.002h-.004C11.088 6.761 9.299 6.5 8 6.5s-3.088.26-3.99.406h-.003l-.005-.002L4 6.9q0 .002 0 0z"/> <path d="M1 2.5A2.5 2.5 0 0 1 3.5 0h9A2.5 2.5 0 0 1 15 2.5v9c0 .818-.393 1.544-1 2v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V14H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a2.5 2.5 0 0 1-1-2zM3.5 1A1.5 1.5 0 0 0 2 2.5v9A1.5 1.5 0 0 0 3.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 1z"/></svg></div>
              <div className="navbar-brand-copy">
                <span className="navbar-brand-title">JeepRoute</span>
                <span className="navbar-brand-tagline">Pampanga commute lab</span>
              </div>
            </div>
            <div className="header-actions navbar-actions">
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
                  <span className="navbar-greeting">
                    Hi, {(currentUser?.email || "User").split("@")[0]}
                  </span>
                  <button
                    className="btn-neon-fill"
                    onClick={() => navigate("/profile")}
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
        </div>
        <div className="jeeprout-layout">
          <div className="jeeproute-grid-container">
            {/* Top Left: Jeep Routes */}
            <div className="grid-jeep-routes">
              <div className="sidebar">
                <div className="plan-card free">
                  <div className="plan-card-title">
                    Smart Jeepney Planning for Pampanga Students
                  </div>
                  {/* Mode Toggle */}
                  <div style={{ display: 'flex', gap: 'clamp(6px, 2vw, 10px)', marginBottom: 'clamp(8px, 2vw, 16px)' }}>
                    <button
                      className={useJeepneyMode ? "btn-neon-fill" : "btn-neon-outline"}
                      style={{ flex: 1, fontSize: 'clamp(10px, 2vw, 13px)', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 12px)' }}
                      onClick={() => setUseJeepneyMode(true)}
                    >
                      🚍 Jeepney Routes
                    </button>
                    <button
                      className={!useJeepneyMode ? "btn-neon-fill" : "btn-neon-outline"}
                      style={{ flex: 1, fontSize: 'clamp(10px, 2vw, 13px)', padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 12px)' }}
                      onClick={() => setUseJeepneyMode(false)}
                    >
                      📍 Town to Town
                    </button>
                  </div>

                  {useJeepneyMode ? (
                    <div className="jeeproute-select-block">
                      {/* Multi-leg Jeepney Trip Planner */}
                      {plannedTrips.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Planned Trips:</div>
                          {plannedTrips.map((trip, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, background: '#f8f9fa', borderRadius: 8, padding: '6px 10px' }}>
                              <span style={{ color: trip.hex, fontWeight: 500, fontSize: 13 }}>{trip.color} Route</span>
                              <span style={{ flex: 1, color: '#2a3441', fontSize: 12 }}>{trip.route}</span>
                              <button onClick={() => handleRemoveTrip(idx)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <JeepneyRouteSelector
                        onRouteSelect={(route) => {
                          setCurrentRoute(route);
                          setSelectedJeepneyRoute(route);
                          setShowJeepneyStops(false); // Reset stops view on new selection
                        }}
                        selectedRoute={currentRoute || selectedJeepneyRoute}
                      />
                      
                      <button
                        className="btn-neon-fill"
                        style={{ width: '100%', marginTop: 12, marginBottom: 12, fontSize: 14 }}
                        onClick={handleAddTrip}
                        disabled={!currentRoute}
                      >
                        + Add Jeepney Trip
                      </button>
                      
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
                  {!useJeepneyMode && (
                    <div className="jeeproute-actions-row">
                      <button
                        className="btn-neon-fill"
                        disabled={!startTown || !endTown || startTown === endTown}
                        onClick={() => {
                          if (!currentUser) {
                            navigate("/signin");
                            return;
                          }
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
                        }}
                      >
                        Plan Route
                      </button>
                    </div>
                  )}
                </div>
                {estimation?.loading && (
                  <div className="plan-card free" style={{ alignItems: "center" }}>
                    <Spinner size={52} color="#00d4ff" text="Calculating estimation..." />
                  </div>
                )}
              </div>
            </div>

            {/* Top Right: Map (only show in Town to Town mode) */}
            {!useJeepneyMode && (
              <div className="grid-map">
                <Mapbox3DMap 
                  estimation={estimation} 
                  selectedJeepneyRoute={null}
                  key={String(useJeepneyMode) + '-' + String(startTown) + '-' + String(endTown) + '-' + String(routeRequested)}
                />
              </div>
            )}
            {/* Show trip summary in grid-map area for Jeepney Routes mode */}
            {useJeepneyMode && (
              <div className="grid-map">
                {plannedTrips.length > 0 && (
                  <div style={{
                    background: '#eaf6ff',
                    borderRadius: 10,
                    padding: '16px 18px',
                    marginBottom: 18,
                    boxShadow: '0 2px 8px #e0e8f7',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Trip Summary</div>
                    <div style={{ display: 'flex', gap: 18, fontSize: 15, marginBottom: 12 }}>
                      <div><strong>Total Distance:</strong> {totalDistance} km</div>
                      <div><strong>Total Time:</strong> {totalTime} min</div>
                      <div><strong>Total Cost:</strong> ₱{totalCost}</div>
                    </div>
                    {/* Show stop-by-stop ETAs for each trip */}
                    {plannedTrips.map((trip, idx) => (
                      <div key={idx} style={{ marginBottom: 18, background: '#fff', borderRadius: 8, boxShadow: '0 1px 6px #e0e8f7', padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: trip.hex, fontSize: 15, marginBottom: 4 }}>{trip.color} Route: {trip.route}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {tripStats[idx]?.stopEtas?.map((stop, sidx) => (
                            <div key={sidx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontWeight: 600, color: trip.hex, minWidth: 60 }}>{sidx + 1}{['st','nd','rd'][sidx] || 'th'} stop</span>
                              <span style={{ flex: 1, color: '#2a3441', fontWeight: 500 }}>{stop.name}</span>
                              <span style={{ color: '#7f94a8', fontSize: 13 }}>ETA: {stop.eta} min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Show jeepney stops estimation after planning in jeepney mode */}
                {showJeepneyStops && selectedJeepneyRoute && selectedJeepneyRoute.stops && selectedJeepneyRoute.stops.length >= 2 && (
                  <JeepneyStopsEstimation 
                    key={selectedJeepneyRoute.color || selectedJeepneyRoute.route} 
                    route={selectedJeepneyRoute} 
                    onBack={() => setShowJeepneyStops(false)}
                  />
                )}
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
                      <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cloud-sun-fill" viewBox="0 0 16 16"><path d="M11.473 11a4.5 4.5 0 0 0-8.72-.99A3 3 0 0 0 3 16h8.5a2.5 2.5 0 0 0 0-5z"/><path d="M10.5 1.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0zm3.743 1.964a.5.5 0 1 0-.707-.707l-.708.707a.5.5 0 0 0 .708.708zm-7.779-.707a.5.5 0 0 0-.707.707l.707.708a.5.5 0 1 0 .708-.708zm1.734 3.374a2 2 0 1 1 3.296 2.198q.3.423.516.898a3 3 0 1 0-4.84-3.225q.529.017 1.028.129m4.484 4.074c.6.215 1.125.59 1.522 1.072a.5.5 0 0 0 .039-.742l-.707-.707a.5.5 0 0 0-.854.377M14.5 6.5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1z"/></svg></span>
                      <span>Real-time weather insights</span>
                    </div>
                    <div className="premium-feature">
                      <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stoplights-fill" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M6 0a2 2 0 0 0-2 2H2c.167.5.8 1.6 2 2v2H2c.167.5.8 1.6 2 2v2H2c.167.5.8 1.6 2 2v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1c1.2-.4 1.833-1.5 2-2h-2V8c1.2-.4 1.833-1.5 2-2h-2V4c1.2-.4 1.833-1.5 2-2h-2a2 2 0 0 0-2-2zm3.5 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M8 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg></span>
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
                          <div className={`feature-card ${card.className}`} key={card.key}>
                            <div className="feature-icon">{card.icon}</div>
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
                      onClick={() => {
                        if (!estimation || estimation.loading) return;
                        setActiveFeature('ai');
                      }}
                      disabled={aiLoading || !estimation || estimation.loading}
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
                  <>
                    {currentUser && !currentUser.is_premium ? (
                      <>
                        <button
                          className="btn-neon-fill"
                          style={{ width: '100%', fontSize: 24, padding: '8px' }}
                          onClick={() => navigate('/details')}
                          disabled={aiLoading}
                        >
                          🤖
                        </button>
                        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text)', textAlign: 'center' }}>
                          <strong>Unlock AI guidance with JeepRoute Plus</strong>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>
                        <span style={{ fontSize: '2.5rem' }}>🤖</span>
                        <p style={{ marginTop: 4 }}>Premium</p>
                      </div>
                    )}
                  </>
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
        height: "100%",
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
