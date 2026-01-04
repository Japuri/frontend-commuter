// Only keep towns and PSGC mapping for name resolution
import towns from "../data/towns.json";
import psgcTowns from "../data/psgc_towns.json";
import { API_BASE_URL } from '../utils/api';
import authFetch from '../utils/authFetch';

// Only keep towns and PSGC mapping for name resolution/backups
export const db = {
	towns,
	psgcTowns,
};

// Fetch user profile from backend
export const getUserById = async (id, token) => {
	const headers = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const navigate = window.navigateForAuthFetch;
	const resp = await authFetch(`${API_BASE_URL}/api/users/${id}/profile`, {
		headers,
		credentials: 'include',
	}, navigate);
	if (!resp.ok) throw new Error('Failed to fetch user profile');
	return await resp.json();
};
export const getTownById = (id) => {
	const idStr = String(id);
	// Try strict match in local towns (handles numeric or string ids)
	const localTown = towns.find((t) => String(t.id) === idStr);
	if (localTown) return localTown;

	// Try PSGC mapping provided by backend keys
	const psgc = psgcTowns.find((t) => t.id === idStr);
	if (psgc) {
		return {
			id: idStr,
			name: psgc.name,
			street: "N/A",
			lat: 15.0,
			lng: 120.6,
			additional: 0,
		};
	}

	// Fallback placeholder
	return {
		id: idStr,
		name: `Town ${idStr}`,
		street: "N/A",
		lat: 15.0,
		lng: 120.6,
		additional: 0,
	};
};
// Get subscription status from backend profile
export const getSubscriptionForUser = async (userId, token) => {
	const profile = await getUserById(userId, token);
	return profile.subscription_status;
};

// Weather and traffic data should be fetched from backend API
export const getWeatherForTown = (townId) => null;
export const getTrafficForTown = (townId) => null;

// Fetch recent travel history from backend
export const getRecentSelectionsForUser = async (userId, token) => {
	const headers = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const navigate = window.navigateForAuthFetch;
	const resp = await authFetch(`${API_BASE_URL}/api/users/${userId}/travel-history?limit=3`, {
		headers,
		credentials: 'include',
	}, navigate);
	if (!resp.ok) throw new Error('Failed to fetch travel history');
	const trips = await resp.json();
	// Add town_name using PSGC mapping if needed
	return trips.map((t) => ({
		...t,
		town_name: getTownById(t.town_id)?.name || t.town_name || `Town ${t.town_id}`,
	}));
};



// Fetch total trips from backend profile
export const getTotalTripsForUser = async (userId, token) => {
	const profile = await getUserById(userId, token);
	return profile.total_trips;
};

// Deprecated: Use backend API for estimations
export const getEstimationsForUser = (userId) => [];

// Deprecated: Use backend API for authentication (signin/signup endpoints)
export function authenticateUser(username, password) {
	return null;
}

// Upgrade user subscription status
export const upgradeSubscription = async (userId, token, newStatus) => {
	const headers = { 'Content-Type': 'application/json' };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const navigate = window.navigateForAuthFetch;
	const resp = await authFetch(`${API_BASE_URL}/api/users/${userId}/subscription`, {
		method: 'POST',
		headers,
		credentials: 'include',
		body: JSON.stringify({ subscription_status: newStatus })
	}, navigate);
	if (!resp.ok) throw new Error('Failed to update subscription');
	return await resp.json();
};

// Log a new trip to the backend
export const logTrip = async (userId, token, tripData) => {
	const headers = { 'Content-Type': 'application/json' };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const navigate = window.navigateForAuthFetch;
	const resp = await authFetch(`${API_BASE_URL}/api/users/${userId}/travel-history`, {
		method: 'POST',
		headers,
		credentials: 'include',
		body: JSON.stringify(tripData)
	}, navigate);
	if (!resp.ok) throw new Error('Failed to log trip');
	return await resp.json();
};
