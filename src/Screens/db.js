import towns from "../data/towns.json";
import users from "../data/users.json";
import subscriptions from "../data/subscriptions.json";
import payments from "../data/payments.json";
import townSelections from "../data/town_selection.json";
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
  // First try to find by exact ID match in local data
  const numericId = typeof id === 'string' ? parseInt(id) : id;
  const localTown = towns.find((t) => t.id === numericId);
  
  if (localTown) {
    return localTown;
  }
  
  // If not found in local data, return a placeholder with the PSGC code as ID
  // This allows the app to work with PSGC towns that don't have local data yet
  return {
    id: id,
    name: `Town ${id}`,
    street: "N/A",
    lat: 15.0,
    lng: 120.6,
    additional: 0
  };
};
export const getSubscriptionForUser = (userId) =>
  subscriptions.find((s) => s.user_id === userId && s.status === "active");

export const getWeatherForTown = (townId) =>
  weatherCache.find((w) => w.town_id === townId);
export const getTrafficForTown = (townId) =>
  travelCache.find((t) => t.town_id === townId);

export const getRecentSelectionsForUser = (userId) =>
  townSelections.filter((ts) => ts.user_id === userId).slice(-3);

export const getEstimationsForUser = (userId) =>
  transitEstimations.filter((te) => te.user_id === userId);

export function authenticateUser(username, password) {
  return (
    users.find((u) => u.username === username && u.password === password) ||
    null
  );
}
