/**
 * Fetch with timeout utility
 * Prevents hung requests from blocking the UI
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000ms = 10 seconds)
 * @returns {Promise} Fetch response
 */
export const fetchWithTimeout = (url, options = {}, timeoutMs = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export default fetchWithTimeout;
