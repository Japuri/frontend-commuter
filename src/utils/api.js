// Utility to get the API base URL depending on environment
// Usage: import { API_BASE_URL } from '../utils/api';

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://backend-commuter.onrender.com');
