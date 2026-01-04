// Utility for authenticated fetch with auto sign-out on 401
// Usage: import authFetch from '../utils/authFetch';

export default async function authFetch(url, options = {}, navigate) {
  const resp = await fetch(url, options);
  if (resp.status === 401) {
    // Clear user and token from localStorage
    localStorage.removeItem('currentUser');
    // Redirect to sign-in if navigate is provided, else use global
    const nav = navigate || window.navigateForAuthFetch;
    if (nav) nav('/signin');
    throw new Error('Session expired. Please sign in again.');
  }
  return resp;
}
