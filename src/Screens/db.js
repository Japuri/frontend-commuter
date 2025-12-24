import towns from "../data/towns.json";
import psgcTowns from "../data/psgc_towns.json";
import users from "../data/users.json";
import subscriptions from "../data/subscriptions.json";
import payments from "../data/payments.json";
import townSelections from "../data/town_selection.json";
import { getLogsForUser } from "../services/travelLogger";
import weatherCache from "../data/weather_cache.json";
import travelCache from "../data/travel_cache.json";
import transitEstimations from "../data/transit_estimations.json";

export const db = {
	towns,
	users,
	subscriptions,
	payments,
	townSelections,
	weatherCache,
	travelCache,
	transitEstimations,
};

export const getUserById = (id) => users.find((u) => u.id === id);
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
export const getSubscriptionForUser = (userId) =>
	subscriptions.find((s) => s.user_id === userId && s.status === "active");

export const getWeatherForTown = (townId) =>
	weatherCache.find((w) => w.town_id === townId);
export const getTrafficForTown = (townId) =>
	travelCache.find((t) => t.town_id === townId);

export const getAllSelectionsForUser = (userId) => {
	const base = townSelections.filter((ts) => ts.user_id === userId);
	const logs = getLogsForUser(userId) || [];
	// Normalize to include town_name
	const normalizedBase = base.map((ts) => {
		const town = getTownById(ts.town_id) || { name: `Town ${ts.town_id}` };
		return { ...ts, town_name: town.name };
	});
	const normalizedLogs = logs.map((l) => {
		const townName = l.town_name || (getTownById(l.town_id)?.name || `Town ${l.town_id}`);
		return { ...l, town_name: townName };
	});
	return [...normalizedBase, ...normalizedLogs]
		.sort((a, b) => new Date(b.selected_at) - new Date(a.selected_at)); // newest first
};

export const getRecentSelectionsForUser = (userId) => {
	return getAllSelectionsForUser(userId).slice(0, 3); // last 3 only for display
};

export const getTotalTripsForUser = (userId) => {
	return getAllSelectionsForUser(userId).length;
};

export const getEstimationsForUser = (userId) =>
	transitEstimations.filter((te) => te.user_id === userId);

export function authenticateUser(username, password) {
	return (
		users.find((u) => u.username === username && u.password === password) ||
		null
	);
}
