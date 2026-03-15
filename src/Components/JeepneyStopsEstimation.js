
import React, { useEffect, useState } from 'react';
import Spinner from './Spinner';
import authFetch from '../utils/authFetch';
import { API_BASE_URL } from '../utils/api';

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
      try {
        // Call backend endpoint for ETA calculation
        const res = await authFetch(`${API_BASE_URL}/api/mapbox-eta/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stops: route.stops }),
        });
        if (!res.ok) {
          throw new Error('Failed to fetch ETA');
        }
        const data = await res.json();
        setEtas(data.etas || []);
      } catch (e) {
        setError('Failed to fetch ETA.');
      }
      setLoading(false);
    }
    fetchEtas();
    // eslint-disable-next-line
  }, [route]);

  if (!route || !route.stops || route.stops.length === 0) return null;

  const finalEta = etas.length > 0 ? etas[etas.length - 1]?.eta : null;

  return (
    <div
      className="plan-card free route-estimation"
      style={{ marginTop: 16, '--route-accent': route.hex }}
    >
      <div className="plan-header route-estimation__title">
        Jeepney Route Stops & Estimation
      </div>
      <div className="route-estimation__meta">
        <span className="route-estimation__badge" aria-hidden="true" />
        <span className="route-estimation__label">{route.color} Route:</span>
        <span className="route-estimation__value">{route.route}</span>
      </div>
      {loading ? (
        <Spinner size={54} color={route.hex} text="Calculating ETAs..." />
      ) : error ? (
        <div className="route-estimation__error">{error}</div>
      ) : (
        <>
          <div className="route-estimation__summary">
            <span>{etas.length} stops tracked</span>
            <span>{finalEta != null ? `Final ETA: ${finalEta} min` : 'ETA unavailable'}</span>
          </div>

          <div className="route-estimation__list">
          {etas.map((stop, idx) => (
            <div key={idx} className="route-estimation__row">
              <span className="route-estimation__stop-index">
                {idx + 1}{['st', 'nd', 'rd'][idx] || 'th'} stop
              </span>
              <span className="route-estimation__stop-name">{stop.name}</span>
              <span className="route-estimation__eta">ETA: {stop.eta} min</span>
            </div>
          ))}
          </div>
        </>
      )}
      <button className="btn-neon-outline route-estimation__back" onClick={onBack}>
        Back to Route Selection
      </button>
    </div>
  );
}
