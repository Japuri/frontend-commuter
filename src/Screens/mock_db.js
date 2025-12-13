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
export const getTownById = (id) => towns.find((t) => t.id === id);
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
