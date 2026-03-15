import { useState, useEffect, useRef } from "react";
import Spinner from "../Components/Spinner";
import JeepneyRouteSelector from "../Components/JeepneyRouteSelector";
import JeepneyStopsEstimation from "../Components/JeepneyStopsEstimation";
import { useNavigate } from "react-router-dom";
import { db, getTownById, logTrip, getUserById, getRecentSelectionsForUser } from "./db";
// import JeepneyLegend from "../Components/JeepneyLegend";
import { logTravel } from "../services/travelLogger";
import {
  weatherBadgeFor,
  confidenceFromIndicators,
  applyPremiumOverrides,
} from "../utils/metrics";
import { API_BASE_URL } from "../utils/api";
import authFetch from "../utils/authFetch";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// import { JEEPNEY_ROUTE_COLORS } from '../data/jeepney_routes';

function Homescreen({ currentUser, setCurrentUser, initialView = "home" }) {
  const getReadableRouteColor = (hex) => {
    const normalized = String(hex || "").replace("#", "");
    if (![3, 6].includes(normalized.length)) return "#1b253a";
    const full = normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.78 ? "#1b253a" : `#${full}`;
  };
  // Multi-trip planning state
  const [plannedTrips, setPlannedTrips] = useState([]); // Array of selected routes
  const [currentRoute, setCurrentRoute] = useState(null); // Route being selected
  // AI Suggestion state for premium users
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I am JeepRoute AI Chat. This is a temporary chat UI while backend integration is in progress.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const chatEndRef = useRef(null);

  // --- Use backend API for trip estimation ---
  const [tripStats, setTripStats] = useState([]); // [{distance, duration, cost, stopEtas: [{name, eta}]}]

  useEffect(() => {
    async function fetchAllTripStats() {
      const stats = await Promise.all(
        plannedTrips.map(async (trip) => {
          if (!trip.stops || trip.stops.length < 2) return { distance: 0, duration: 0, cost: 0, stopEtas: [] };
          try {
            // Use backend endpoint instead of direct Mapbox API call
            const res = await authFetch(`${API_BASE_URL}/api/mapbox-eta/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ stops: trip.stops }),
            });
            if (!res.ok) {
              throw new Error('Failed to fetch trip stats');
            }
            const data = await res.json();
            // Backend returns etas array with {name, eta}
            const stopEtas = data.etas || [];
            // Calculate totals from ETA data
            const lastStop = stopEtas[stopEtas.length - 1];
            const durationMin = lastStop?.eta || 0;
            // Estimate distance based on duration (assuming ~25 km/h average)
            const distanceKm = (durationMin / 60) * 25;
            const cost = 12 + Math.ceil(distanceKm * 2);
            return { distance: distanceKm, duration: durationMin, cost, stopEtas };
          } catch (e) {
            console.error('Error fetching trip stats:', e);
            return { distance: 0, duration: 0, cost: 0, stopEtas: [] };
          }
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

  const handleJeepneyRouteSelect = (route) => {
    setCurrentRoute(route);
    setSelectedJeepneyRoute(route);
    setShowJeepneyStops(false);
    setShowColoredTripPlanner(true);
  };

  const handleToggleColoredTripPlanner = () => {
    const nextOpen = !showColoredTripPlanner;
    setShowColoredTripPlanner(nextOpen);
    setIsColoredTripPlannerPinned(nextOpen);
    if (!nextOpen) {
      setShowJeepneyStops(false);
    }
  };

  const handleCloseColoredTripPlanner = () => {
    setShowColoredTripPlanner(false);
    setShowJeepneyStops(false);
    setIsColoredTripPlannerPinned(false);
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

  const handleSendTempChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatSending) return;
    if (!currentUser) {
      navigate("/signin", { state: { redirectTo: "/" } });
      return;
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatSending(true);

    const lower = trimmed.toLowerCase();
    let reply = "Thanks for your message. Backend AI chat is not connected yet, but this UI is ready for integration.";
    if (lower.includes("fare") || lower.includes("bayad")) {
      reply = "I can help with fare guidance soon. For now, check route details and payment plans while backend chat is being connected.";
    } else if (lower.includes("traffic") || lower.includes("eta") || lower.includes("time")) {
      reply = "Live ETA and traffic answers will come from backend AI later. This temporary chat can already receive/send messages.";
    } else if (lower.includes("route") || lower.includes("jeep")) {
      reply = "Route suggestions will be available once AI chat API is connected. You can still plan routes from the Routes section now.";
    }

    window.setTimeout(() => {
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setChatSending(false);
    }, 450);
  };

  const handleAskAIButton = () => {
    if (!currentUser) {
      navigate("/signin", { state: { redirectTo: "/" } });
      return;
    }
    setIsChatOpen((prev) => !prev);
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

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chatMessages, chatSending]);

  useEffect(() => {
    if (!currentUser) {
      setIsChatOpen(false);
    }
  }, [currentUser]);
  // Jeepney route selection state
  const [selectedJeepneyRoute, setSelectedJeepneyRoute] = useState(null);
  const [showColoredTripPlanner, setShowColoredTripPlanner] = useState(false);
  const [isColoredTripPlannerPinned, setIsColoredTripPlannerPinned] = useState(false);
  // Congratulatory popup state
  const [showCongrats, setShowCongrats] = useState(false);
  // Show stops estimation after planning jeepney route
  const [showJeepneyStops, setShowJeepneyStops] = useState(false);
  const [showPremiumInfo, setShowPremiumInfo] = useState(false);
  const [showUpgradeInfo, setShowUpgradeInfo] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [homeStats, setHomeStats] = useState({
    profile: null,
    history: [],
  });

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
  const [navPendingKey, setNavPendingKey] = useState("");
  const [activeView, setActiveView] = useState(initialView);
  const [openTownPicker, setOpenTownPicker] = useState(null);
  const [townSearchTerm, setTownSearchTerm] = useState("");
  const [showAllWalletTrips, setShowAllWalletTrips] = useState(false);
  const [expandedTripStops, setExpandedTripStops] = useState({});
  const [navUserOpen, setNavUserOpen] = useState(false);
  const navUserRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navUserRef.current && !navUserRef.current.contains(e.target)) {
        setNavUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const selectedStartTown =
    towns.find((town) => String(town.id) === String(startTown)) ||
    getTownById(startTown);
  const selectedEndTown =
    towns.find((town) => String(town.id) === String(endTown)) ||
    getTownById(endTown);
  const canPlanTownRoute = Boolean(
    startTown && endTown && String(startTown) !== String(endTown)
  );
  const filteredTowns = towns.filter((town) =>
    String(town.name || "")
      .toLowerCase()
      .includes(townSearchTerm.trim().toLowerCase())
  );

  const openPlannerTownPicker = (field) => {
    setOpenTownPicker((currentField) =>
      currentField === field ? null : field
    );
    setTownSearchTerm("");
  };

  const handlePlannerTownPick = async (field, townId) => {
    if (field === "start") {
      handleSetStartTown(townId);
    } else {
      await handleSetEndTown(townId);
    }
    setOpenTownPicker(null);
    setTownSearchTerm("");
  };

  const handlePlanTownRoute = () => {
    if (!currentUser) {
      navigate("/signin");
      return;
    }

    if (currentUser?.id) {
      let townName;
      try {
        const byId = towns.find((town) => String(town.id) === String(endTown));
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

    setOpenTownPicker(null);
    setRouteRequested(true);
  };

  const switchView = (nextView) => {
    if (nextView === activeView) {
      if (nextView === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const updateView = () => {
      setActiveView(nextView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(updateView);
    } else {
      updateView();
    }
  };

  const navigateWithTransition = (path, key) => {
    if (navPendingKey) return;

    setNavPendingKey(key);
    const doNavigate = () => navigate(path);

    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(doNavigate);
    } else {
      setTimeout(doNavigate, 120);
    }
  };

  const withSpinner = (key, label) => (
    navPendingKey === key ? (
      <>
        <span className="btn-inline-spinner" aria-hidden="true" />
        {label}
      </>
    ) : (
      label
    )
  );

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
    let cancelled = false;

    async function fetchHomeStats() {
      if (!currentUser?.id || !currentUser?.token) {
        setHomeStats({ profile: null, history: [] });
        return;
      }

      try {
        const [profile, history] = await Promise.all([
          getUserById(currentUser.id, currentUser.token),
          getRecentSelectionsForUser(currentUser.id, currentUser.token),
        ]);

        if (cancelled) return;
        setHomeStats({
          profile: profile || null,
          history: Array.isArray(history) ? history : [],
        });
      } catch (error) {
        if (!cancelled) {
          setHomeStats({ profile: null, history: [] });
        }
      }
    }

    fetchHomeStats();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.token]);

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
  // Keep the old planner dashboard available for later redesign steps.
  const showLegacyPlanner = activeView === "routes";

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
      ? "Calculating ETA..."
      : `${estimation.minutes ?? "—"} mins ETA`
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

  const weatherBadgeName = insightsReady
    ? weatherBadgeFor(estimation.weather)
    : "badge-info";
  const minEta = insightsReady
    ? Math.max(5, Math.round(estimation.minutes - 4))
    : null;
  const maxEta = insightsReady ? Math.round(estimation.minutes + 6) : null;
  const confidence = insightsReady
    ? confidenceFromIndicators(0, weatherBadgeName)
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
      icon: "⏱️",
      title: "Travel Time",
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
          <div className="popover-badges">
            <span className="badge badge-ok">
              Arrival: {minEta}–{maxEta} mins
            </span>
            <span className="badge badge-warn">Confidence: {confidence}
            </span>
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
              <p className="popover-line" style={{ color: "#8a633f" }}>
                {aiSuggestion.rationale || "Insights calibrated"}
              </p>
            </div>
          ) : (
            <p className="popover-line" style={{ color: "#8a633f" }}>
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

  const tripsCompleted = homeStats.profile?.total_trips ?? 0;
  const recentTrips = homeStats.history?.length ?? 0;
  const latestDestination = homeStats.history?.[0]?.town_name || "No trip yet";
  const avgPlannedEta = tripStats.length
    ? Math.round(tripStats.reduce((sum, t) => sum + (t.duration || 0), 0) / tripStats.length)
    : null;
  const selectedColoredRoute = currentRoute || selectedJeepneyRoute;
  const visibleWalletTrips = showAllWalletTrips ? plannedTrips : plannedTrips.slice(0, 2);

  const homeStatCards = [
    {
      icon: "🧾",
      value: String(tripsCompleted),
      label: "Trips Completed",
    },
    {
      icon: "🕘",
      value: String(recentTrips),
      label: "Recent Trips Logged",
    },
    {
      icon: "📍",
      value: latestDestination,
      label: "Latest Destination",
    },
    {
      icon: "◷",
      value: avgPlannedEta ? `${avgPlannedEta} min` : "No active plan",
      label: "Current Average ETA",
    },
  ];

  const onboardingSteps = [
    {
      step: "STEP 1",
      icon: "📍",
      title: "Choose Your Route",
      copy: "Select your origin and destination from the route list or search bar.",
    },
    {
      step: "STEP 2",
      icon: "🧭",
      title: "View on Map",
      copy: "See the full route on an interactive map with all stops highlighted.",
    },
    {
      step: "STEP 3",
      icon: "💳",
      title: "Check Fare & Details",
      copy: "Get instant fare calculation with student discount applied automatically.",
    },
    {
      step: "STEP 4",
      icon: "🤖",
      title: "Ask JeepAI",
      copy: "Use our AI chatbot for personalized route recommendations and tips.",
    },
  ];

  const smartTips = [
    {
      icon: "🛡️",
      title: "Student ID Required",
      copy: "Always carry your valid student ID for discounted fares.",
    },
    {
      icon: "🗺️",
      title: "Know Your Route",
      copy: "Check the route map before boarding to ensure you are on the right jeepney.",
    },
    {
      icon: "⚡",
      title: "Real-time Updates",
      copy: "Enable notifications for route changes, fare updates, and traffic alerts.",
    },
    {
      icon: "⭐",
      title: "Premium Benefits",
      copy: "Upgrade for ad-free experience, offline maps, and advanced AI features.",
    },
  ];

  return (
    <>
      <CongratsModal />
      <div className="jeeproute-page dashboard-shell home-landing-page">
        <div className="jeeproute-navbar">
          <div className="navbar-shell home-navbar-shell">
            <div className="navbar-brand-block">
              <div className="navbar-badge" aria-hidden="true">↗</div>
              <div className="navbar-brand-copy">
                <span className="navbar-brand-title">
                  Jeep<span className="home-brand-route">Route</span>
                </span>
              </div>
            </div>

            <div className="home-navbar-links" aria-label="Primary">
              <button className={`home-nav-link${activeView === "home" ? " is-active" : ""}`} onClick={() => switchView("home")}>Home</button>
              <button className={`home-nav-link${activeView === "routes" ? " is-active" : ""}`} onClick={() => switchView("routes")}>Routes</button>
              <button className="home-nav-link" onClick={() => navigateWithTransition("/details", "nav-plans")}>Plans</button>
            </div>

            <div className="header-actions navbar-actions">
              {!loggedIn ? (
                <>
                  <button
                    className="btn-neon-outline"
                    onClick={() => navigateWithTransition("/signin", "nav-signin")}
                    disabled={!!navPendingKey}
                  >
                    {withSpinner("nav-signin", "Sign In")}
                  </button>
                  <button
                    className="btn-neon-fill"
                    onClick={() => navigateWithTransition("/signup", "nav-signup")}
                    disabled={!!navPendingKey}
                  >
                    {withSpinner("nav-signup", "Get Started")}
                  </button>
                </>
              ) : (
                <div className="nav-user-menu" ref={navUserRef}>
                  <button
                    className="nav-user-trigger"
                    onClick={() => setNavUserOpen(o => !o)}
                    aria-expanded={navUserOpen}
                    aria-haspopup="true"
                  >
                    Hello, {(currentUser.username || currentUser.email || "User").split("@")[0]} <span className="nav-user-caret">{navUserOpen ? "▲" : "▼"}</span>
                  </button>
                  {navUserOpen && (
                    <div className="nav-user-dropdown">
                      <button className="nav-user-option" onClick={() => { setNavUserOpen(false); navigateWithTransition("/profile", "nav-profile-btn"); }}>
                        Profile
                      </button>
                      <button className="nav-user-option nav-user-option-signout" onClick={() => { setNavUserOpen(false); setCurrentUser(null); localStorage.removeItem("currentUser"); navigate("/"); }}>
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {activeView === "home" && (
        <main className="home-landing-main">
          <section className="home-hero-section">
            <div className="home-hero-surface">
              <div className="home-hero-content">
                <span className="home-pill">AI-Powered Commute Assistant</span>
                <h1 className="home-hero-title">
                  Navigate Your City
                  <span> Smarter</span>
                </h1>
                <p className="home-hero-copy">
                  Find the best jeepney routes, get real-time fare estimates, and enjoy student discounts - all powered by AI.
                </p>
                <div className="home-hero-actions">
                  <button className="btn-neon-fill" onClick={() => switchView("routes")}>Explore Routes</button>
                  {!loggedIn && (
                    <button className="btn-neon-outline" onClick={() => navigateWithTransition("/signup", "hero-signup")} disabled={!!navPendingKey}>{withSpinner("hero-signup", "Create Account")}</button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="home-trust-section home-section-block home-section-block-cool">
            {loggedIn ? (
              <>
                <div className="home-stats-head">
                  <span className="home-stats-chip">Live Dashboard</span>
                  <h2>Your Commute Snapshot</h2>
                  <p>View your recent travel history and live planner calculations.</p>
                </div>
                <div className="home-stats-grid">
                  {homeStatCards.map((card) => (
                    <article className="home-stat-card" key={card.label}>
                      <div className="home-stat-icon">{card.icon}</div>
                      <strong>{card.value}</strong>
                      <span>{card.label}</span>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="home-stats-guest" role="status" aria-live="polite">
                <div className="home-stats-guest-badge">Personalized Insights</div>
                <h3>Sign up or Log in to see your statistics</h3>
                <p>
                  Track completed trips, recent destinations, and your average travel time in one place.
                </p>
                <div className="home-stats-guest-actions">
                  <button className="btn-neon-fill" onClick={() => navigateWithTransition("/signin", "guest-signin")} disabled={!!navPendingKey}>{withSpinner("guest-signin", "Log In")}</button>
                  <button className="btn-neon-outline" onClick={() => navigateWithTransition("/signup", "guest-signup")} disabled={!!navPendingKey}>{withSpinner("guest-signup", "Sign Up")}</button>
                </div>
              </div>
            )}
          </section>

          <section className="home-guide-section home-section-block home-section-block-warm">
            <div className="home-guide-head">
              <span className="home-guide-chip">Easy as 1-2-3-4</span>
              <h2>How to Use JeepRoute</h2>
              <p>Get started in seconds with our intuitive interface.</p>
            </div>

            <div className="home-guide-grid">
              {onboardingSteps.map((item) => (
                <article className="home-guide-card" key={item.step}>
                  <div className="home-guide-meta">
                    <span className="home-guide-icon">{item.icon}</span>
                    <span className="home-guide-step">{item.step}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="home-tips-section home-section-block home-section-block-cool">
            <div className="home-guide-head">
              <span className="home-guide-chip">Guidelines</span>
              <h2>Tips for Smart Commuting</h2>
              <p>Follow these guidelines for the best experience.</p>
            </div>

            <div className="home-tips-grid">
              {smartTips.map((item) => (
                <article className="home-tip-card" key={item.title}>
                  <span className="home-tip-icon">{item.icon}</span>
                  <div className="home-tip-copy">
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
        )}

        {showLegacyPlanner && (
        <div className="jeeprout-layout">
          <div className="jeeproute-grid-container route-planner-grid">
            <div className="grid-jeep-routes route-planner-shell">
              <div className="route-planner-card">
                <div className="route-planner-head">
                  <div className="route-planner-intro">
                    <span className="route-planner-eyebrow">Legacy Planner</span>
                    <h2>Plan your town-to-town trip</h2>
                    <p>
                      Pick a starting town and destination. Plan your commutes better.
                    </p>
                  </div>

                  <div
                    className={`colored-trip-wallet${showColoredTripPlanner ? " is-open" : ""}${isColoredTripPlannerPinned ? " is-pinned" : ""}`}
                  >
                    <button
                      type="button"
                      className={`colored-trip-planner-fab${
                        showColoredTripPlanner ? " is-open" : ""
                      }`}
                      onClick={handleToggleColoredTripPlanner}
                      aria-expanded={showColoredTripPlanner}
                      aria-controls="colored-trip-planner-panel"
                      aria-pressed={isColoredTripPlannerPinned}
                    >
                      <span className="colored-trip-planner-fab-icon" aria-hidden="true">
                        ₱
                      </span>
                      <span className="colored-trip-planner-fab-copy">
                        <strong>Trip Wallet</strong>
                        <small>Allows you to see your planned trips and their costs</small>
                      </span>
                      <span className="colored-trip-planner-fab-summary" aria-hidden="true">
                        <span>{plannedTrips.length} trip{plannedTrips.length === 1 ? "" : "s"}</span>
                        <strong>₱{totalCost}</strong>
                      </span>
                    </button>

                    {showColoredTripPlanner && (
                      <section
                        className="colored-trip-planner-panel"
                        id="colored-trip-planner-panel"
                        aria-label="Colored trip planner"
                      >
                        <div className="colored-trip-planner-header">
                          <div>
                            <p className="colored-trip-planner-kicker">Wallet helper</p>
                            <h3>Stack multiple jeepney routes</h3>
                            <p>
                              Choose a colored route to add to your trip.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="colored-trip-planner-close"
                            onClick={handleCloseColoredTripPlanner}
                            aria-label="Close colored trip planner"
                          >
                            ×
                          </button>
                        </div>

                        <JeepneyRouteSelector
                          onRouteSelect={handleJeepneyRouteSelect}
                          selectedRoute={selectedColoredRoute}
                        />

                        <div className="colored-trip-planner-actions">
                          <button
                            type="button"
                            className="btn-neon-fill colored-trip-action"
                            onClick={handleAddTrip}
                            disabled={!currentRoute}
                          >
                            + Add Jeepney Trip
                          </button>
                        </div>

                        <div className="colored-trip-planner-metrics">
                          <article className="colored-trip-metric-card">
                            <span>Total Distance</span>
                            <strong>{totalDistance} km</strong>
                          </article>
                          <article className="colored-trip-metric-card">
                            <span>Total Time</span>
                            <strong>{totalTime} min</strong>
                          </article>
                          <article className="colored-trip-metric-card">
                            <span>Total Cost</span>
                            <strong>₱{totalCost}</strong>
                          </article>
                        </div>

                        {plannedTrips.length > 0 ? (
                          <div className="colored-trip-planner-stack">
                            {visibleWalletTrips.map((trip, idx) => {
                              const tripIndex = idx;
                              const stopEtas = tripStats[tripIndex]?.stopEtas || [];

                              return (
                              <article
                                key={`${trip.color}-${trip.route}-${idx}`}
                                className="colored-trip-card"
                                style={{ "--colored-trip-accent": trip.hex }}
                              >
                                <div className="colored-trip-card-head">
                                  <div>
                                    <p
                                      className="colored-trip-card-title"
                                      style={{ color: getReadableRouteColor(trip.hex) }}
                                    >
                                      {trip.color} Route
                                    </p>
                                    <p className="colored-trip-card-copy">{trip.route}</p>
                                  </div>
                                  <button
                                    type="button"
                                    className="colored-trip-card-remove"
                                    onClick={() => handleRemoveTrip(tripIndex)}
                                    aria-label={`Remove ${trip.color} route`}
                                  >
                                    ×
                                  </button>
                                </div>

                                <div className="colored-trip-card-stats">
                                  <span>
                                    {tripStats[tripIndex]?.distance
                                      ? `${tripStats[tripIndex].distance.toFixed(2)} km`
                                      : "0.00 km"}
                                  </span>
                                  <span>{tripStats[tripIndex]?.duration || 0} min</span>
                                  <span>₱{tripStats[tripIndex]?.cost || 0}</span>
                                </div>

                                <button
                                  type="button"
                                  className="colored-trip-load-stops-btn"
                                  onClick={() =>
                                    setExpandedTripStops((prev) => ({
                                      ...prev,
                                      [tripIndex]: !prev[tripIndex],
                                    }))
                                  }
                                >
                                  {expandedTripStops[tripIndex] ? 'Hide Stops ▲' : 'Load Chosen Stops ▼'}
                                </button>

                                {expandedTripStops[tripIndex] && stopEtas.length > 0 && (
                                  <div className="colored-trip-stop-list">
                                    {stopEtas.map((stop, stopIndex) => (
                                      <div
                                        key={`${trip.color}-${stop.name}-${stopIndex}`}
                                        className="colored-trip-stop-row"
                                      >
                                        <span
                                          className="colored-trip-stop-order"
                                          style={{ color: getReadableRouteColor(trip.hex) }}
                                        >
                                          {stopIndex + 1}
                                        </span>
                                        <span className="colored-trip-stop-name">
                                          {stop.name}
                                        </span>
                                        <span className="colored-trip-stop-eta">
                                          ETA {stop.eta} min
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </article>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="colored-trip-planner-empty">
                            Pick a color-coded route and add it to your trip stack.
                          </div>
                        )}

                        {plannedTrips.length > 2 && (
                          <button
                            type="button"
                            className="colored-trip-stack-toggle"
                            onClick={() => setShowAllWalletTrips((prev) => !prev)}
                          >
                            {showAllWalletTrips
                              ? "Show fewer saved trips"
                              : `Show all saved trips (${plannedTrips.length})`}
                          </button>
                        )}

                        {showJeepneyStops &&
                          selectedJeepneyRoute &&
                          selectedJeepneyRoute.stops &&
                          selectedJeepneyRoute.stops.length >= 2 && (
                            <JeepneyStopsEstimation
                              key={selectedJeepneyRoute.color || selectedJeepneyRoute.route}
                              route={selectedJeepneyRoute}
                              onBack={() => setShowJeepneyStops(false)}
                            />
                          )}
                      </section>
                    )}
                  </div>
                </div>

                <div className="route-town-boxes">
                  <button
                    type="button"
                    className={`route-town-box${
                      openTownPicker === "start" ? " active" : ""
                    }`}
                    onClick={() => openPlannerTownPicker("start")}
                    aria-expanded={openTownPicker === "start"}
                  >
                    <span className="route-town-box-label">Start town</span>
                    <span
                      className={`route-town-box-value${
                        selectedStartTown ? "" : " placeholder"
                      }`}
                    >
                      {selectedStartTown?.name || "Choose your origin"}
                    </span>
                    <span className="route-town-box-meta">
                      {towns.length > 0
                        ? "Tap to browse available towns"
                        : "Loading towns..."}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`route-town-box${
                      openTownPicker === "end" ? " active" : ""
                    }`}
                    onClick={() => openPlannerTownPicker("end")}
                    aria-expanded={openTownPicker === "end"}
                  >
                    <span className="route-town-box-label">End town</span>
                    <span
                      className={`route-town-box-value${
                        selectedEndTown ? "" : " placeholder"
                      }`}
                    >
                      {selectedEndTown?.name || "Choose your destination"}
                    </span>
                    <span className="route-town-box-meta">
                      {towns.length > 0
                        ? "Tap to browse available towns"
                        : "Loading towns..."}
                    </span>
                  </button>
                </div>

                {openTownPicker && (
                  <div
                    className="route-town-picker"
                    role="dialog"
                    aria-modal="false"
                    aria-label={
                      openTownPicker === "start"
                        ? "Select start town"
                        : "Select end town"
                    }
                  >
                    <div className="route-town-picker-header">
                      <div>
                        <p className="route-town-picker-kicker">Town picker</p>
                        <h3>
                          {openTownPicker === "start"
                            ? "Select your starting town"
                            : "Select your destination town"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        className="route-town-picker-close"
                        onClick={() => setOpenTownPicker(null)}
                        aria-label="Close town picker"
                      >
                        ×
                      </button>
                    </div>

                    <label className="route-town-search">
                      <span>Search towns</span>
                      <input
                        type="text"
                        value={townSearchTerm}
                        onChange={(event) => setTownSearchTerm(event.target.value)}
                        placeholder="Search by town name"
                      />
                    </label>

                    <div className="route-town-list">
                      {filteredTowns.length > 0 ? (
                        filteredTowns.map((town) => {
                          const isSelected =
                            openTownPicker === "start"
                              ? String(startTown) === String(town.id)
                              : String(endTown) === String(town.id);

                          return (
                            <button
                              type="button"
                              key={town.id}
                              className={`route-town-option${
                                isSelected ? " selected" : ""
                              }`}
                              onClick={() =>
                                handlePlannerTownPick(openTownPicker, town.id)
                              }
                            >
                              <span className="route-town-option-name">
                                {town.name}
                              </span>
                              <span className="route-town-option-meta">
                                {isSelected ? "Selected" : "Tap to select"}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="route-town-empty">
                          No towns match your search.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="route-planner-footer">
                  <p className="route-planner-summary">
                    {canPlanTownRoute
                      ? `${selectedStartTown?.name} to ${selectedEndTown?.name}`
                      : startTown && endTown && String(startTown) === String(endTown)
                        ? "Pick two different towns to continue."
                        : "Select a start and end town to enable route planning."}
                  </p>
                  <button
                    className="btn-neon-fill route-plan-button"
                    disabled={!canPlanTownRoute}
                    onClick={handlePlanTownRoute}
                  >
                    Plan Route
                  </button>
                </div>

                {estimation?.loading && (
                  <div className="route-planner-loading">
                    <Spinner
                      size={48}
                      color="#00d4ff"
                      text="Calculating estimation..."
                    />
                  </div>
                )}

                <section className="route-map-panel">
                  <div className="route-map-panel-header">
                    <div>
                      <p className="route-map-panel-kicker">Map section</p>
                      <h3>Mapbox route preview</h3>
                    </div>
                    <p className="route-map-panel-copy">
                      {routeRequested && canPlanTownRoute
                        ? `${selectedStartTown?.name || "Start"} to ${
                            selectedEndTown?.name || "Destination"
                          }`
                        : "The map appears here after you plan a route."}
                    </p>
                  </div>
                  <div className="route-map-panel-body">
                    <Mapbox3DMap
                      estimation={estimation}
                      selectedJeepneyRoute={null}
                      key={`${startTown}-${endTown}-${routeRequested}`}
                    />
                  </div>
                </section>
              </div>
            </div>

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
                      <span>Route Analytics</span>
                    </div>
                    <div className="premium-feature">
                      <span>🤖</span>
                      <span>AI-powered insights</span>
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
                    <li>🌦️ Real-time weather Data</li>
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
                <button
                  type="button"
                  className="ask-ai-launch-btn"
                  onClick={handleAskAIButton}
                >
                  {currentUser ? (isChatOpen ? "Hide AI Chat" : "Open AI Chat") : "Sign In to Use AI Chat"}
                </button>
                <p className="ask-ai-launch-copy">
                  {currentUser
                    ? "Chat opens as a floating panel so it won't take grid space."
                    : "Sign in or sign up first to open the AI chat panel."}
                </p>
              </div>
            </div>

            {isChatOpen && currentUser && (
              <div className="ask-ai-float-chat" role="dialog" aria-label="AI chat panel">
                <div className="ask-ai-float-head">
                  <p className="ask-ai-float-title">JeepRoute AI Chat</p>
                  <button
                    type="button"
                    className="ask-ai-float-close"
                    aria-label="Close AI chat"
                    onClick={() => setIsChatOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="ask-ai-chat-wrap">
                  <div className="ask-ai-chat-window" aria-live="polite">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`ask-ai-msg ${msg.role === "user" ? "is-user" : "is-bot"}`}
                      >
                        <div className="ask-ai-bubble">{msg.text}</div>
                        <span className="ask-ai-msg-time">{msg.time}</span>
                      </div>
                    ))}
                    {chatSending && (
                      <div className="ask-ai-msg is-bot">
                        <div className="ask-ai-bubble">Typing...</div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="ask-ai-composer">
                    <input
                      type="text"
                      className="ask-ai-input"
                      placeholder="Type your message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendTempChat();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ask-ai-send"
                      onClick={handleSendTempChat}
                      disabled={chatSending || !chatInput.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {showLegacyPlanner && (
          <button
            type="button"
            className={`ask-ai-corner-fab${isChatOpen ? " is-hidden" : ""}`}
            onClick={handleAskAIButton}
            aria-label={currentUser ? "Open AI chat" : "Sign in to use AI chat"}
          >
            <span className="ask-ai-corner-fab-icon" aria-hidden="true">💬</span>
            <span className="ask-ai-corner-fab-text">Chat</span>
          </button>
        )}
      </div>
    </>
  );
}

// Mapbox 3D Map Component
const envMapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
const MAPBOX_TOKEN =
  envMapboxToken && envMapboxToken !== "your_token_here"
    ? envMapboxToken
    : "pk.eyJ1IjoiamFwdXJpIiwiYSI6ImNtampoeW10czIxMW8zZHF4dTE2cGJ5bHMifQ.vcz9vRGxvmuiRYQlO8iaXg";

function Mapbox3DMap({ estimation, selectedJeepneyRoute }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState(null);

  // Helper: get traffic color (defaulted to green)
  function getTrafficColor(trafficData) {
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
