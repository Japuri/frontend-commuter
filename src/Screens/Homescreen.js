import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TownSelector from "../Components/TownSelector";
import { db, getTownById } from "./db";
import {
  weatherBadgeFor,
  trafficSeverityFromData,
  trafficBadgeFor,
  confidenceFromIndicators,
  applyPremiumOverrides,
} from "../utils/metrics";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
          time_of_day: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // Use JWT or session auth if needed
        const resp = await fetch("https://backend-commuter.onrender.com/api/ai-suggestion/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add auth header if needed
          },
          credentials: "include",
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error("AI suggestion failed: " + (await resp.text()));
        const data = await resp.json();
        setAiSuggestion(data);
      } catch (e) {
        setAiError(e.message || "AI error");
      } finally {
        setAiLoading(false);
      }
    };
  const [startTown, setStartTown] = useState(() => sessionStorage.getItem('startTown') || "");
  const [endTown, setEndTown] = useState(() => sessionStorage.getItem('endTown') || "");
  // Congratulatory popup state
  const [showCongrats, setShowCongrats] = useState(false);
  
  // Persist town selections in sessionStorage
  const handleSetStartTown = (val) => {
    setStartTown(val);
    try { sessionStorage.setItem('startTown', val); } catch(e){}
  };
  const handleSetEndTown = (val) => {
    setEndTown(val);
    try { sessionStorage.setItem('endTown', val); } catch(e){}
  };
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
            const r = await fetch(`https://backend-commuter.onrender.com/api/distance/?start=${encodeURIComponent(startId)}&end=${encodeURIComponent(endId)}`);
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
              const wr = await fetch(`https://backend-commuter.onrender.com/api/weather/?town=${encodeURIComponent(townId)}`);
              if (!wr.ok) return null;
              const wj = await wr.json();
              const data = wj.data || wj;
              try { sessionStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data })); } catch(e){}
              return data;
            } catch (e) { return null; }
          }

          const [, endWeather] = await Promise.all([loadWeather(startId), loadWeather(endId)]);

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

  // Restore towns from sessionStorage after upgrade and trigger estimation
  useEffect(() => {
    if (sessionStorage.getItem('showCongrats')) {
      setShowCongrats(true);
      sessionStorage.removeItem('showCongrats');
    }
    // Always restore towns from sessionStorage after upgrade
    const sTown = sessionStorage.getItem('startTown');
    const eTown = sessionStorage.getItem('endTown');
    if (sTown && sTown !== startTown) setStartTown(sTown);
    if (eTown && eTown !== endTown) setEndTown(eTown);
    // If both towns are present, estimation effect will run
  }, [startTown, endTown]);

  // Congratulatory popup modal
  const CongratsModal = () => showCongrats ? (
    <div className="congrats-modal-overlay">
      <div className="congrats-modal-box">
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#00b894', marginBottom: 8 }}>Thank you for being a Plus member!</div>
        <div style={{ fontSize: 16, color: '#333', marginBottom: 18 }}>You now have access to all premium features.<br/>Enjoy JeepRoute Plus!</div>
        <button className="btn-neon-fill" style={{ minWidth: 120 }} onClick={() => setShowCongrats(false)}>Close</button>
      </div>
    </div>
  ) : null;

  const loggedIn = !!currentUser;

  return (
    <>
      <CongratsModal />
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
                  setStartTown={handleSetStartTown}
                  setEndTown={handleSetEndTown}
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
                          <div style={{ marginTop: 16 }}>
                            <button className="btn-neon-fill" style={{ minWidth: 180 }} onClick={handleActivateAIMode} disabled={aiLoading}>
                              {aiLoading ? 'Loading AI Suggestion...' : 'Activate AI mode'}
                            </button>
                          </div>
                          {aiError && (
                            <div className="premium-desc" style={{ color: '#ff6b6b', marginTop: 8 }}>{aiError}</div>
                          )}
                          {aiSuggestion && (
                            <div className="ai-suggestion-card" style={{ marginTop: 18, padding: 14, borderRadius: 10, background: 'rgba(0,212,255,0.08)', border: '1px solid #00d4ff55', color: '#dbe6ef', boxShadow: '0 0 10px #00d4ff22' }}>
                              <div style={{ fontWeight: 600, color: '#00d4ff', marginBottom: 6 }}>AI Recommendation</div>
                              <div style={{ fontSize: '1.1em', marginBottom: 4 }}><b>Optimal Departure:</b> {aiSuggestion.window || 'N/A'}</div>
                              <div style={{ color: '#7fa2bd', fontSize: '0.98em' }}>{aiSuggestion.rationale || ''}</div>
                            </div>
                          )}
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
                      <div className="premium-thanks">Thank you for being a Plus member!</div>
                </div>
              )}
            </div>
          </div>

          <div className="jeeproute-map">
            <Mapbox3DMap estimation={estimation} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// Mapbox 3D Map Component
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function Mapbox3DMap({ estimation }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  // Helper: get traffic color
  function getTrafficColor(trafficData) {
    // You can adjust this logic as needed
    const severity = trafficSeverityFromData ? trafficSeverityFromData(trafficData) : 0;
    if (severity >= 70) return '#e74c3c'; // red
    if (severity >= 40) return '#f1c40f'; // yellow
    return '#27ae60'; // green
  }

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!estimation?.start || !estimation?.end) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Clean up previous map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [estimation.start.lng, estimation.start.lat],
      zoom: 10,
      pitch: 50,
      bearing: 0,
      antialias: true
    });
    mapRef.current = map;

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());

    // Add 3D buildings layer on load
    map.on('load', () => {
      // 3D buildings
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
      )?.id;
      map.addLayer(
        {
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ["get", "height"],
            'fill-extrusion-base': ["get", "min_height"],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );

      // Add route line with traffic color
      const trafficColor = getTrafficColor(estimation.trafficData);
      map.addSource('route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'geometry': {
            'type': 'LineString',
            'coordinates': [
              [estimation.start.lng, estimation.start.lat],
              [estimation.end.lng, estimation.end.lat]
            ]
          }
        }
      });
      map.addLayer({
        'id': 'route-line',
        'type': 'line',
        'source': 'route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': trafficColor,
          'line-width': 5
        }
      });

      // Add start marker
      new mapboxgl.Marker({ color: '#0074D9' })
        .setLngLat([estimation.start.lng, estimation.start.lat])
        .addTo(map);
      // Add end marker
      new mapboxgl.Marker({ color: '#FF4136' })
        .setLngLat([estimation.end.lng, estimation.end.lat])
        .addTo(map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [estimation]);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '550px', borderRadius: 12, overflow: 'hidden', background: '#eaf6ff' }}
    >
      {!estimation?.start || !estimation?.end ? (
        <div style={{textAlign:'center',paddingTop:120,color:'#888'}}>Selected route shows here</div>
      ) : null}
    </div>
  );
}

export default Homescreen;
