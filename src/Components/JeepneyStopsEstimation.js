import React, { useEffect, useState } from 'react';
import Spinner from './Spinner';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

export default function JeepneyStopsEstimation({ route, onBack }) {
  const [etas, setEtas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEtas() {
      setLoading(true);
      setError(null);
      if (!route || !route.stops || route.stops.length < 2) {
        setEtas([]);
        setLoading(false);
        return;
      }
      let cumulative = 0;
      const etaArr = [{ eta: 0, name: route.stops[0].name }];
      try {
        for (let i = 1; i < route.stops.length; i++) {
          const prev = route.stops[i - 1];
          const curr = route.stops[i];
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${prev.lng},${prev.lat};${curr.lng},${curr.lat}?overview=false&access_token=${MAPBOX_TOKEN}`;
          const res = await fetch(url);
          const data = await res.json();
          const duration = data.routes?.[0]?.duration || 0; // seconds
          cumulative += Math.round(duration / 60); // minutes
          etaArr.push({ eta: cumulative, name: curr.name });
        }
        setEtas(etaArr);
      } catch (e) {
        setError('Failed to fetch ETA.');
      }
      setLoading(false);
    }
    fetchEtas();
    // eslint-disable-next-line
  }, [route]);

  if (!route || !route.stops || route.stops.length === 0) return null;

  return (
    <div className="plan-card free" style={{ marginTop: 16 }}>
      <div className="plan-header">Jeepney Route Stops & Estimation</div>
      <div style={{ marginBottom: 12, color: '#7f94a8', fontSize: 14 }}>
        {route.color} Route: {route.route}
      </div>
      {loading ? (
        <Spinner size={54} color={route.hex} text="Calculating ETAs..." />
      ) : error ? (
        <div style={{ color: 'red', fontSize: 15, textAlign: 'center', margin: '18px 0' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
          {etas.map((stop, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8f9fa', borderRadius: 8, padding: '8px 14px' }}>
              <span style={{ fontWeight: 600, color: route.hex, minWidth: 60 }}>{idx + 1}{['st','nd','rd'][idx] || 'th'} stop</span>
              <span style={{ flex: 1, color: '#2a3441', fontWeight: 500 }}>{stop.name}</span>
              <span style={{ color: '#7f94a8', fontSize: 13 }}>ETA: {stop.eta} min</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn-neon-outline" style={{ marginTop: 18 }} onClick={onBack}>
        Back to Route Selection
      </button>
    </div>
  );
}
