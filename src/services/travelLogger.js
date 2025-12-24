const STORAGE_KEY = "travel_logs_v1";

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function logTravel({
  user_id,
  town_id,
  town_name,
  selected_at = new Date().toISOString(),
}) {
  const all = loadAll();
  all.push({ user_id, town_id, town_name, selected_at });
  saveAll(all);
}

export function getLogsForUser(userId) {
  const all = loadAll();
  return all.filter((l) => String(l.user_id) === String(userId));
}

export function clearLogsForUser(userId) {
  const rest = loadAll().filter((l) => String(l.user_id) !== String(userId));
  saveAll(rest);
}
